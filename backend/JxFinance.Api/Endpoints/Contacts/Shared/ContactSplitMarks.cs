using JxFinance.Domain.Contacts;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Contacts.Shared;

public static class ContactSplitMarks
{
    public static async Task<Dictionary<TransactionId, ContactSplitResponse>> OfAsync(
        AppDbContext db,
        IReadOnlyCollection<TransactionId> transactionIds,
        CancellationToken cancellationToken)
    {
        var ids = transactionIds.ToList();
        var splits = await db.ContactSplits
            .AsNoTracking()
            .Where(s => ids.Contains(s.TransactionId))
            .ToListAsync(cancellationToken);
        var shares = await SharesAsync(db, [.. splits.Select(s => s.Id)], cancellationToken);

        return splits.ToDictionary(s => s.TransactionId, s => ToResponse(s, shares));
    }

    public static async Task<ContactSplitResponse> OfAsync(AppDbContext db, ContactSplit split, CancellationToken cancellationToken) =>
        ToResponse(split, await SharesAsync(db, [split.Id], cancellationToken));

    private static ContactSplitResponse ToResponse(ContactSplit split, ILookup<ContactSplitId, ContactShareResponse> shares) =>
        new(split.Id.Value, split.Method, split.OwnWeight, split.OwnAmount, [.. shares[split.Id]]);

    private static async Task<ILookup<ContactSplitId, ContactShareResponse>> SharesAsync(
        AppDbContext db,
        IReadOnlyCollection<ContactSplitId> splitIds,
        CancellationToken cancellationToken)
    {
        var ids = splitIds.ToList();
        var shares = await db.ContactSplitShares
            .Where(s => ids.Contains(s.ContactSplitId))
            .Join(db.Contacts, s => s.ContactId, c => c.Id, (s, c) => new { s.ContactSplitId, s.ContactId, c.Name, s.Weight, s.Amount })
            .ToListAsync(cancellationToken);

        return shares
            .OrderBy(s => s.Name, StringComparer.CurrentCultureIgnoreCase)
            .ToLookup(s => s.ContactSplitId, s => new ContactShareResponse(s.ContactId.Value, s.Name, s.Weight, s.Amount));
    }
}
