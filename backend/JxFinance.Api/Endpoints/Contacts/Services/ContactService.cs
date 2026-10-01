using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.SettleUp;
using JxFinance.Common.Trash;
using JxFinance.Domain.Common;
using JxFinance.Domain.Contacts;
using JxFinance.Domain.Households;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Contacts.CreateContact;
using JxFinance.Endpoints.Contacts.CreateContactPayment;
using JxFinance.Endpoints.Contacts.CreateContactSplit;
using JxFinance.Endpoints.Contacts.GetContactEntries;
using JxFinance.Endpoints.Contacts.Interfaces;
using JxFinance.Endpoints.Contacts.Shared;
using JxFinance.Endpoints.Contacts.UpdateContact;
using JxFinance.Endpoints.Contacts.UpdateContactSplit;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Contacts.Services;

[RegisterService<IContactService>(LifeTime.Scoped)]
public sealed class ContactService(AppDbContext db, ICurrentUser currentUser, IDeletionRecorder deletions) : IContactService
{
    private static readonly DomainError ContactMissing = EntityLookup.NotFound("Person not found.");
    private static readonly DomainError SplitMissing = EntityLookup.NotFound("Split not found.");
    private static readonly DomainError PaymentMissing = EntityLookup.NotFound("Payment not found.");
    private static readonly DomainError UnknownContact = new(ErrorCodes.ReferenceNotFound, "Person not found.");
    private static readonly DomainError SharesMismatch =
        new(ErrorCodes.SettleUpSharesMismatch, "The amounts must add up to the expense.");

    private Guid Me => currentUser.Id;

    public async Task<IReadOnlyList<ContactResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var contacts = await db.Contacts.AsNoTracking().ToListAsync(cancellationToken);
        return await DescribeAsync(
            [.. contacts.OrderBy(c => c.Name, StringComparer.CurrentCultureIgnoreCase).ThenBy(c => c.Id.Value)],
            cancellationToken);
    }

    public async Task<Result<ContactResponse>> CreateAsync(CreateContactRequest request, CancellationToken cancellationToken)
    {
        var contact = new Contact { Name = request.Name.Trim() };
        db.Contacts.Add(contact);
        await db.SaveChangesAsync(cancellationToken);

        return new ContactResponse(contact.Id.Value, contact.Name, []);
    }

    public async Task<Result<ContactResponse>> RenameAsync(UpdateContactRequest request, CancellationToken cancellationToken)
    {
        var id = new ContactId(request.Id);
        var renamed = await db.UpdateOrNotFoundAsync<Contact>(
            c => c.Id == id,
            ContactMissing,
            c => c.Name = request.Name.Trim(),
            cancellationToken);
        if (!renamed.TryGetValue(out var contact))
        {
            return renamed.Error;
        }

        return (await DescribeAsync([contact], cancellationToken))[0];
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var contactId = new ContactId(id);
        return db.DeleteOrNotFoundAsync<Contact>(
            id,
            c => c.Id == contactId,
            ContactMissing,
            contact => deletions.Record(TrashKind.Contact, id, contact.Name),
            cancellationToken);
    }

    public async Task<Result<PagedResponse<ContactEntryResponse>>> GetEntriesAsync(
        GetContactEntriesRequest request,
        CancellationToken cancellationToken)
    {
        var contactId = new ContactId(request.Id);
        if (!await db.Contacts.AnyAsync(c => c.Id == contactId, cancellationToken))
        {
            return ContactMissing;
        }

        var shares = await db.ContactSplitShares
            .Where(s => s.ContactId == contactId)
            .Join(db.ContactSplits, s => s.ContactSplitId, split => split.Id, (s, split) => new
            {
                split.Id,
                split.TransactionId,
                split.Date,
                split.Description,
                split.Amount.Currency,
                s.Amount,
                split.CreatedAt,
            })
            .ToListAsync(cancellationToken);
        var counted = await CountedAsync([.. shares.Select(s => s.TransactionId)], cancellationToken);
        var payments = await db.ContactPayments
            .AsNoTracking()
            .Where(p => p.ContactId == contactId)
            .ToListAsync(cancellationToken);

        var entries = shares
            .Select(s => (s.CreatedAt, Entry: new ContactEntryResponse(
                s.Id.Value,
                ContactEntryKind.Split,
                s.Date,
                s.Description,
                s.Amount,
                s.Currency,
                null,
                counted.Contains(s.TransactionId))))
            .Concat(payments.Select(p => (p.CreatedAt, Entry: ToEntry(p))))
            .OrderByDescending(e => e.Entry.Date)
            .ThenByDescending(e => e.CreatedAt)
            .ThenBy(e => e.Entry.Id)
            .Select(e => e.Entry)
            .ToList();
        var page = Math.Max(request.Page, 1);
        var pageSize = Math.Clamp(request.PageSize, 1, Paging.MaxPageSize);

        return new PagedResponse<ContactEntryResponse>(
            [.. entries.Skip((page - 1) * pageSize).Take(pageSize)],
            page,
            pageSize,
            entries.Count);
    }

    public async Task<Result<ContactEntryResponse>> CreatePaymentAsync(
        CreateContactPaymentRequest request,
        CancellationToken cancellationToken)
    {
        var contactId = new ContactId(request.Id);
        if (!await db.Contacts.AnyAsync(c => c.Id == contactId, cancellationToken))
        {
            return ContactMissing;
        }

        var payment = new ContactPayment
        {
            ContactId = contactId,
            Direction = request.Direction,
            Amount = new Money(request.Amount, request.Currency),
            Date = request.Date,
            Note = OptionalText.Normalize(request.Note),
        };
        db.ContactPayments.Add(payment);
        await db.SaveChangesAsync(cancellationToken);

        return ToEntry(payment);
    }

    public async Task<Result<Guid>> DeletePaymentAsync(Guid id, CancellationToken cancellationToken)
    {
        var paymentId = new ContactPaymentId(id);
        var found = await db.ContactPayments.FindOrNotFoundAsync(p => p.Id == paymentId, PaymentMissing, cancellationToken);
        if (!found.TryGetValue(out var payment))
        {
            return found.Error;
        }

        var name = await db.Contacts.Where(c => c.Id == payment.ContactId).Select(c => c.Name).FirstOrDefaultAsync(cancellationToken) ?? "";
        deletions.Record(
            TrashKind.ContactPayment,
            id,
            payment.Direction == ContactPaymentDirection.ToContact
                ? SettleUpText.Paid("You", name, payment.Amount)
                : SettleUpText.Paid(name, "you", payment.Amount));
        db.ContactPayments.Remove(payment);
        await db.SaveChangesAsync(cancellationToken);

        return id;
    }

    public async Task<Result<ContactSplitResponse>> CreateSplitAsync(
        CreateContactSplitRequest request,
        CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(request.TransactionId);
        var transaction = await db.Transactions.AsNoTracking().FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
        if (await SplitRules.RefusedAsync(db, Me, transaction, cancellationToken) is { } refused)
        {
            return refused;
        }

        if (await SplitRules.IsSplitAsync(db, transactionId, Guid.Empty, cancellationToken))
        {
            return SplitRules.AlreadySplit;
        }

        var split = new ContactSplit { TransactionId = transactionId };
        Copy(transaction!, split);
        var shares = await SharesAsync(split, request, cancellationToken);
        if (!shares.TryGetValue(out var rows))
        {
            return shares.Error;
        }

        db.ContactSplits.Add(split);
        db.ContactSplitShares.AddRange(rows);
        if (await db.SaveOrConflictAsync(SplitRules.AlreadySplit, cancellationToken) is { } conflict)
        {
            return conflict;
        }

        return await ContactSplitMarks.OfAsync(db, split, cancellationToken);
    }

    public async Task<Result<ContactSplitResponse>> UpdateSplitAsync(
        UpdateContactSplitRequest request,
        CancellationToken cancellationToken)
    {
        var splitId = new ContactSplitId(request.Id);
        var found = await db.ContactSplits.FindOrNotFoundAsync(s => s.Id == splitId, SplitMissing, cancellationToken);
        if (!found.TryGetValue(out var split))
        {
            return found.Error;
        }

        var transaction = await db.Transactions.AsNoTracking().FirstOrDefaultAsync(t => t.Id == split.TransactionId, cancellationToken);
        if (await SplitRules.RefusedAsync(db, Me, transaction, cancellationToken) is { } refused)
        {
            return refused;
        }

        Copy(transaction!, split);
        var shares = await SharesAsync(split, request, cancellationToken);
        if (!shares.TryGetValue(out var wanted))
        {
            return shares.Error;
        }

        var stored = await db.ContactSplitShares.Where(s => s.ContactSplitId == split.Id).ToListAsync(cancellationToken);
        foreach (var share in stored.Where(s => wanted.TrueForAll(w => w.ContactId != s.ContactId)))
        {
            db.ContactSplitShares.Remove(share);
        }

        foreach (var share in wanted)
        {
            if (stored.Find(s => s.ContactId == share.ContactId) is { } kept)
            {
                kept.Weight = share.Weight;
                kept.Amount = share.Amount;
            }
            else
            {
                db.ContactSplitShares.Add(share);
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        return await ContactSplitMarks.OfAsync(db, split, cancellationToken);
    }

    public async Task<Result<Guid>> DeleteSplitAsync(Guid id, CancellationToken cancellationToken)
    {
        var splitId = new ContactSplitId(id);
        var found = await db.ContactSplits.FindOrNotFoundAsync(s => s.Id == splitId, SplitMissing, cancellationToken);
        if (!found.TryGetValue(out var split))
        {
            return found.Error;
        }

        var shares = await db.ContactSplitShares.CountAsync(s => s.ContactSplitId == split.Id, cancellationToken);
        deletions.Record(TrashKind.ContactSplit, id, SettleUpText.Split(split.Description, split.Date, split.Amount, shares));
        db.ContactSplits.Remove(split);
        await db.SaveChangesAsync(cancellationToken);

        return id;
    }

    private static void Copy(Transaction transaction, ContactSplit split)
    {
        split.Date = transaction.Date;
        split.Description = TextLimit.Ellipsize(OptionalText.Normalize(transaction.Description), ContactSplit.DescriptionMaxLength);
        split.Amount = transaction.Amount;
    }

    private async Task<Result<List<ContactSplitShare>>> SharesAsync(
        ContactSplit split,
        IContactSplitInput input,
        CancellationToken cancellationToken)
    {
        var ids = input.Shares.Select(s => new ContactId(s.ContactId)).ToList();
        if (await db.Contacts.CountAsync(c => ids.Contains(c.Id), cancellationToken) != ids.Count)
        {
            return UnknownContact;
        }

        SharePart[] own = input.Own is { } part ? [new SharePart(part.Weight, part.Amount)] : [];
        var amounts = ShareAllocator.Allocate(
            split.Amount.Amount,
            input.Method,
            [.. own, .. input.Shares.Select(s => new SharePart(s.Weight, s.Amount))]);
        if (amounts is null)
        {
            return SharesMismatch;
        }

        var byWeight = input.Method == SplitMethod.Shares;
        split.Method = input.Method;
        split.OwnWeight = byWeight ? input.Own?.Weight : null;
        split.OwnAmount = input.Own is null ? null : amounts[0];

        return input.Shares
            .Select((share, index) => new ContactSplitShare
            {
                ContactSplitId = split.Id,
                ContactId = new ContactId(share.ContactId),
                Weight = byWeight ? share.Weight : null,
                Amount = amounts[index + own.Length],
            })
            .ToList();
    }

    private async Task<List<ContactResponse>> DescribeAsync(
        IReadOnlyList<Contact> contacts,
        CancellationToken cancellationToken)
    {
        var balances = await BalancesAsync(cancellationToken);
        return
        [
            .. contacts.Select(contact => new ContactResponse(
                contact.Id.Value,
                contact.Name,
                [
                    .. balances
                        .Where(b => b.Key.ContactId == contact.Id.Value)
                        .OrderBy(b => b.Key.Currency)
                        .Select(b => new ContactBalanceResponse(b.Key.Currency, b.Value)),
                ])),
        ];
    }

    private async Task<Dictionary<(Guid ContactId, Currency Currency), decimal>> BalancesAsync(CancellationToken cancellationToken)
    {
        var splits = await db.ContactSplits
            .AsNoTracking()
            .Select(s => new { s.Id, s.TransactionId, s.Amount.Currency })
            .ToListAsync(cancellationToken);
        var counted = await CountedAsync([.. splits.Select(s => s.TransactionId)], cancellationToken);
        var currencies = splits.Where(s => counted.Contains(s.TransactionId)).ToDictionary(s => s.Id, s => s.Currency);
        var splitIds = currencies.Keys.ToList();
        var shares = await db.ContactSplitShares
            .Where(s => splitIds.Contains(s.ContactSplitId))
            .Select(s => new { s.ContactSplitId, s.ContactId, s.Amount })
            .ToListAsync(cancellationToken);
        var payments = await db.ContactPayments
            .AsNoTracking()
            .Select(p => new { p.ContactId, p.Direction, p.Amount })
            .ToListAsync(cancellationToken);

        return ContactBalances.Of(
            shares.Select(s => new ContactShareEntry(s.ContactId.Value, currencies[s.ContactSplitId], s.Amount)),
            payments.Select(p => new ContactPaymentEntry(p.ContactId.Value, p.Direction, p.Amount.Currency, p.Amount.Amount)));
    }

    private async Task<HashSet<TransactionId>> CountedAsync(
        IReadOnlyCollection<TransactionId> transactionIds,
        CancellationToken cancellationToken)
    {
        var ids = transactionIds.ToList();
        return
        [
            .. await db.Transactions
                .IgnoreQueryFilters(QueryFilters.OwnerOnly)
                .Where(t => ids.Contains(t.Id))
                .Select(t => t.Id)
                .ToListAsync(cancellationToken),
        ];
    }

    private static ContactEntryResponse ToEntry(ContactPayment payment) => new(
        payment.Id.Value,
        ContactEntryKind.Payment,
        payment.Date,
        payment.Note,
        payment.Amount.Amount,
        payment.Amount.Currency,
        payment.Direction,
        true);
}
