using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.RecurringBills;
using JxFinance.Common.References;
using JxFinance.Common.Settings;
using JxFinance.Common.Sharing;
using JxFinance.Common.Trash;
using JxFinance.Common.Unusual;
using JxFinance.Common.Validation;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.ExchangeRates;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;
using JxFinance.Endpoints.RecurringBills.CreateRecurringBill;
using JxFinance.Endpoints.RecurringBills.GetBillsCalendar;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Mappers;
using JxFinance.Endpoints.RecurringBills.Shared;
using JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;
using JxFinance.Endpoints.Transfers.CreateTransfer;
using JxFinance.Endpoints.Transfers.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.RecurringBills.Services;

[RegisterService<IRecurringBillService>(LifeTime.Scoped)]
public sealed class RecurringBillService(
    AppDbContext db,
    ITransactionValuation valuations,
    IReferenceGuard references,
    IDeletionRecorder deletions,
    ITransferService transfers,
    IInstanceSettingsStore settings,
    ISharingGuard sharing,
    ICurrentUser currentUser,
    IExchangeRateService rates,
    IClock clock) : IRecurringBillService
{
    private const int CalendarMonthsAway = 12;

    private static readonly DomainError NotFound = EntityLookup.NotFound("Recurring entry not found.");

    private static readonly DomainError CategoryGone =
        new(ErrorCodes.ReferenceNotFound, "The category of this recurring entry is no longer available.");

    private static readonly DomainError DebtMissing = new(ErrorCodes.ReferenceNotFound, "Debt does not exist.");
    private static readonly DomainError DebtNotTracked = new(ErrorCodes.DebtNotTracked, "Turn on payment tracking for this debt first.");

    private static readonly DomainError CategoryNotExpense =
        new(ErrorCodes.CategoryWrongType, "Choose an accessible expense category.");

    private static readonly DomainError CategoryNotIncome =
        new(ErrorCodes.CategoryWrongType, "Choose an accessible income category.");

    public async Task<IReadOnlyList<RecurringBillResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var bills = await db.RecurringBills.AsNoTracking().OrderBy(b => b.NextDueDate).ToListAsync(cancellationToken);
        var matches = await LatestMatchesAsync(bills, cancellationToken);
        return bills.Select(b => b.ToResponse(matches.GetValueOrDefault(b.Id))).ToList();
    }

    private async Task<Dictionary<RecurringBillId, RecurringBillMatchResponse>> LatestMatchesAsync(
        List<RecurringBill> bills,
        CancellationToken cancellationToken)
    {
        var eligible = bills
            .Where(b => b.IsActive && b.Shape == RecurringBillShape.Expense && b.AccountId is not null)
            .ToList();
        if (!settings.Current.IsEnabled(Feature.UnusualAmounts) || eligible.Count == 0)
        {
            return [];
        }

        var accountIds = eligible.Select(b => b.AccountId!.Value).Distinct().ToList();
        var currencies = await db.Accounts
            .Where(a => accountIds.Contains(a.Id))
            .Select(a => new { Key = a.Id, Value = a.StartingBalance.Currency })
            .ToDictionaryAsync(x => x.Key, x => x.Value, cancellationToken);
        var keys = eligible.SelectMany(PriceRiseMatcher.KeysOf).Distinct().ToList();
        var charges = await PriceRiseMatcher.LoadChargesAsync(db.Transactions, accountIds, clock.Today, FlowType.Expense, cancellationToken, keys);

        var matches = new Dictionary<RecurringBillId, RecurringBillMatchResponse>();
        foreach (var bill in eligible)
        {
            if (!currencies.TryGetValue(bill.AccountId!.Value, out var currency))
            {
                continue;
            }

            var target = BillMatchTarget.Of(bill, currency);
            if (charges.FirstOrDefault(charge => PriceRiseMatcher.Matches(target, charge)) is not { } latest)
            {
                continue;
            }

            var comparison = PriceRiseMatcher.Compare(target, latest, charges);
            matches[bill.Id] = new RecurringBillMatchResponse(
                latest.Date,
                latest.Amount,
                comparison?.Expected,
                comparison?.IsRise ?? false);
        }

        return matches;
    }

    public async Task<Result<RecurringBillResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await FindAsync(id, cancellationToken) is { } bill
            ? await ResponseAsync(bill, cancellationToken)
            : NotFound;
    }

    private async Task<RecurringBillResponse> ResponseAsync(RecurringBill bill, CancellationToken cancellationToken) =>
        bill.ToResponse((await LatestMatchesAsync([bill], cancellationToken)).GetValueOrDefault(bill.Id));

    public async Task<Result<RecurringBillResponse>> CreateAsync(
        CreateRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        var error = await sharing.CheckAsync(request, cancellationToken) ?? await ValidateReferencesAsync(request, cancellationToken);
        if (error is not null) return error;

        var bill = request.ToEntity();
        db.RecurringBills.Add(bill);
        await db.SaveChangesAsync(cancellationToken);

        return await ResponseAsync(bill, cancellationToken);
    }

    public async Task<Result<RecurringBillResponse>> UpdateAsync(
        UpdateRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        if (await FindAsync(request.Id, cancellationToken) is not { } bill)
        {
            return NotFound;
        }

        var error = await sharing.CheckAsync(bill, request, cancellationToken) ?? await ValidateReferencesAsync(request, cancellationToken);
        if (error is not null) return error;

        request.ApplyTo(bill);
        await db.SaveChangesAsync(cancellationToken);

        return await ResponseAsync(bill, cancellationToken);
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        return db.DeleteOrNotFoundAsync<RecurringBill>(
            id,
            b => b.Id == billId,
            NotFound,
            bill =>
            {
                if (bill.UserId != currentUser.Id)
                {
                    return Task.FromResult<DomainError?>(new DomainError(ErrorCodes.AccessForbidden, "Only the owner can delete a shared recurring entry."));
                }

                deletions.Record(TrashKind.RecurringBill, id, bill.Name);
                return Task.FromResult<DomainError?>(null);
            },
            cancellationToken);
    }

    public async Task<Result<ConfirmRecurringBillResponse>> ConfirmAsync(
        ConfirmRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(request.Id, cancellationToken);
        if (await FindAsync(request.Id, cancellationToken) is not { } bill)
        {
            return NotFound;
        }

        if (!bill.IsActive)
            return new DomainError(ErrorCodes.RecurringBillInactive, "This recurring entry is inactive.");
        if (request.ExpectedDueDate != bill.NextDueDate)
            return new DomainError(ErrorCodes.ConflictStale, "This occurrence has changed or was already confirmed. Refresh the entry.");

        var amount = ResolveAmount(bill, request);
        if (amount.IsFailure)
        {
            return amount.Error;
        }

        Guid? transactionId = null;
        Guid? transferId = null;
        if (bill.Shape == RecurringBillShape.Transfer)
        {
            var posted = await PostTransferAsync(bill, request, amount.Value, cancellationToken);
            if (posted.IsFailure) return posted.Error;
            transferId = posted.Value;
        }
        else
        {
            var posted = await PostTransactionAsync(bill, request, amount.Value, cancellationToken);
            if (posted.IsFailure) return posted.Error;
            transactionId = posted.Value;
            if (bill.DebtId is { } debtId && settings.Current.IsEnabled(Feature.NetWorth)
                && await db.Debts.AnyAsync(d => d.Id == debtId && d.TracksPayments, cancellationToken))
            {
                db.DebtPayments.Add(new DebtPayment { DebtId = debtId, TransactionId = new TransactionId(posted.Value), Kind = DebtPaymentKind.Regular });
            }
        }

        bill.Advance();

        await db.Notifications.Where(n => n.RelatedType == NotificationRelated.RecurringBill && n.RelatedId == request.Id && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), cancellationToken);

        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);
        return new ConfirmRecurringBillResponse(await ResponseAsync(bill, cancellationToken), transactionId, transferId);
    }

    public async Task<Result<BillsCalendarResponse>> GetCalendarAsync(string? month, CancellationToken cancellationToken)
    {
        var parsed = MonthKey.Parse(month);
        if (!parsed.TryGetValue(out var first))
        {
            return parsed.Error;
        }

        var today = clock.Today;
        if (Math.Abs(((first.Year - today.Year) * 12) + first.Month - today.Month) > CalendarMonthsAway)
        {
            return new DomainError(ErrorCodes.RangeInvalid, $"Choose a month at most {CalendarMonthsAway} months from the current one.");
        }

        var last = first.AddMonths(1).AddDays(-1);
        var bills = await db.RecurringBills.AsNoTracking().Where(b => b.IsActive).ToListAsync(cancellationToken);
        var currencies = await db.Accounts
            .AsNoTracking()
            .Select(a => new { a.Id, a.StartingBalance.Currency })
            .ToDictionaryAsync(a => a.Id, a => a.Currency, cancellationToken);
        var occurrences = bills.SelectMany(bill => Scheduled(bill, first, last)).ToList();
        var lookBack = today.AddMonths(-RecurringEstimate.LookBackMonths);
        var loadFrom = first.AddDays(-RecurringMatch.PaidToleranceDays);
        var loadTo = last.AddDays(RecurringMatch.PaidToleranceDays);
        var rows = await RecurringHistory.LoadAsync(
            db,
            bills,
            loadFrom < lookBack ? loadFrom : lookBack,
            loadTo > today ? loadTo : today,
            cancellationToken);
        var paid = RecurringMatch.Assign(occurrences, rows);
        var latest = await rates.GetLatestAsync(cancellationToken);
        var table = rates.IsFresh(latest, today) ? latest : RateTable.Empty;
        var expected = bills.ToDictionary(bill => bill, bill => Expected(bill, currencies, rows, lookBack, today));

        decimal expectedOut = 0m, expectedIn = 0m, paidOut = 0m;
        var partial = false;
        var unpriced = new HashSet<RecurringBillId>();
        var result = new List<BillOccurrence>(occurrences.Count);
        foreach (var occurrence in occurrences)
        {
            var bill = occurrence.Bill;
            var amount = expected[bill];
            var row = paid.GetValueOrDefault(occurrence);
            var scheduled = occurrence.Date >= bill.NextDueDate;
            if (bill.Shape != RecurringBillShape.Transfer)
            {
                var converted = amount is null ? null : table.Convert(amount.Amount, amount.Currency, rates.ReportingCurrency);
                if (amount is null)
                {
                    unpriced.Add(bill.Id);
                }
                else if (converted is not { } reporting)
                {
                    partial = true;
                }
                else
                {
                    partial |= amount.Estimated;
                    expectedOut += bill.Shape == RecurringBillShape.Expense ? reporting : 0m;
                    expectedIn += bill.Shape == RecurringBillShape.Income ? reporting : 0m;
                }

                paidOut += bill.Shape == RecurringBillShape.Expense ? row?.ReportingAmount ?? 0m : 0m;
            }

            result.Add(new BillOccurrence(
                occurrence.Date,
                bill.Id.Value,
                bill.Name,
                bill.Shape,
                row?.Amount ?? amount?.Amount,
                row?.Currency ?? amount?.Currency,
                row is null && amount is { Estimated: true },
                StatusOf(occurrence, row, scheduled, today),
                occurrence.Date == bill.NextDueDate,
                row is not null && scheduled,
                bill.AccountId is { } accountId && !currencies.ContainsKey(accountId),
                (row?.AccountId ?? bill.AccountId)?.Value,
                row?.TransactionId));
        }

        return new BillsCalendarResponse(
            first,
            last,
            expectedOut,
            expectedIn,
            paidOut,
            partial,
            unpriced.Count,
            [.. result
                .OrderBy(o => o.Date)
                .ThenBy(o => o.Name, StringComparer.CurrentCultureIgnoreCase)
                .ThenBy(o => o.BillId)]);
    }

    private IEnumerable<ScheduledOccurrence> Scheduled(RecurringBill bill, DateOnly first, DateOnly last)
    {
        var createdOn = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(bill.CreatedAt, clock.TimeZone).DateTime);
        return RecurringOccurrences.Before(bill, first, last, createdOn)
            .Concat(RecurringOccurrences.After(bill, first, last))
            .Select(date => new ScheduledOccurrence(bill, date));
    }

    private static ExpectedAmount? Expected(
        RecurringBill bill,
        Dictionary<AccountId, Currency> currencies,
        List<RecurringRow> rows,
        DateOnly lookBack,
        DateOnly today)
    {
        if (bill.AccountId is not { } accountId || !currencies.TryGetValue(accountId, out var currency))
        {
            return null;
        }

        if (bill.Kind == RecurringBillKind.Fixed)
        {
            return bill.Amount is { } amount ? new ExpectedAmount(amount, currency, false) : null;
        }

        var keys = PriceRiseMatcher.KeysOf(bill);
        var estimate = RecurringEstimate.Of(rows
            .Where(row => row.Date >= lookBack && row.Date <= today && row.Currency == currency && RecurringMatch.Pays(bill, keys, row))
            .Select(row => (row.Date, row.Amount)));
        return estimate is { } value ? new ExpectedAmount(value, currency, true) : null;
    }

    private static BillOccurrenceStatus StatusOf(ScheduledOccurrence occurrence, RecurringRow? row, bool scheduled, DateOnly today)
    {
        if (row is not null)
        {
            return BillOccurrenceStatus.Paid;
        }

        if (occurrence.Date >= today)
        {
            return BillOccurrenceStatus.Due;
        }

        return scheduled ? BillOccurrenceStatus.Overdue : BillOccurrenceStatus.NoMatch;
    }

    private sealed record ExpectedAmount(decimal Amount, Currency Currency, bool Estimated);

    private Task<RecurringBill?> FindAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        return db.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId, cancellationToken);
    }

    private static Result<decimal> ResolveAmount(RecurringBill bill, ConfirmRecurringBillRequest request)
    {
        if (bill.Kind == RecurringBillKind.Fixed)
        {
            return bill.Amount!.Value;
        }

        if (request.Amount is not { } confirmed || confirmed <= 0 || !DecimalRules.FitsMoney(confirmed))
        {
            return new DomainError(
                ErrorCodes.MoneyPositive,
                "A variable recurring entry needs an amount to confirm.");
        }

        return confirmed;
    }

    private async Task<Result<Guid>> PostTransactionAsync(
        RecurringBill bill,
        ConfirmRecurringBillRequest request,
        decimal amount,
        CancellationToken cancellationToken)
    {
        var accountId = request.AccountId is { } requestAccountId ? new AccountId(requestAccountId) : bill.AccountId;
        if (accountId is null)
        {
            return new DomainError(
                ErrorCodes.Required,
                "An account is required to confirm this recurring entry.");
        }

        var flow = FlowOf(bill.Shape);
        var referenceError = await references.AccountExistsAsync(accountId.Value, cancellationToken);
        if (referenceError is null && bill.CategoryId is { } categoryId)
        {
            referenceError = await references.CategoryOfTypeAsync(categoryId, flow, CategoryGone, cancellationToken);
        }

        if (referenceError is not null)
        {
            return referenceError;
        }

        var value = await valuations.ValueAsync(accountId.Value, amount, null, bill.NextDueDate, [], cancellationToken);
        if (!value.TryGetValue(out var valued))
        {
            return value.Error;
        }

        var transaction = new Transaction
        {
            AccountId = accountId.Value,
            CategoryId = bill.CategoryId,
            Type = flow,
            Amount = valued.Amount,
            ReportingAmount = valued.ReportingAmount,
            Date = bill.NextDueDate,
            Description = bill.Name,
            Source = TransactionSource.Manual,
            SpreadMonths = bill.SpreadMonths,
        };
        db.Transactions.Add(transaction);

        return transaction.Id.Value;
    }

    private async Task<Result<Guid>> PostTransferAsync(
        RecurringBill bill,
        ConfirmRecurringBillRequest request,
        decimal amount,
        CancellationToken cancellationToken)
    {
        if (bill.AccountId is not { } fromAccountId || bill.ToAccountId is not { } toAccountId)
        {
            return new DomainError(
                ErrorCodes.Required,
                "Both accounts are required to confirm this recurring transfer.");
        }

        var created = await transfers.CreateAsync(
            new CreateTransferRequest(
                fromAccountId.Value,
                toAccountId.Value,
                amount,
                bill.NextDueDate,
                bill.Name,
                ReceivedAmount: request.ReceivedAmount),
            cancellationToken);

        return created.Map(transfer => transfer.Id);
    }

    private static FlowType FlowOf(RecurringBillShape shape) =>
        shape == RecurringBillShape.Income ? FlowType.Income : FlowType.Expense;

    private async Task<DomainError?> ValidateReferencesAsync(IRecurringBillInput input, CancellationToken ct)
    {
        if (input.AccountId is { } from && await references.AccountExistsAsync(new AccountId(from), ct) is { } fromError) return fromError;
        if (input.ToAccountId is { } to && await references.AccountExistsAsync(new AccountId(to), ct) is { } toError) return toError;
        if (input.DebtId is { } debt && settings.Current.IsEnabled(Feature.NetWorth))
        {
            var tracks = await db.Debts.Where(d => d.Id == new DebtId(debt)).Select(d => (bool?)d.TracksPayments).FirstOrDefaultAsync(ct);
            if (tracks is null) return DebtMissing;
            if (tracks is false) return DebtNotTracked;
        }

        var shared = new SharedReferences(
            [.. new[] { input.AccountId, input.ToAccountId }.OfType<Guid>().Select(id => new AccountId(id))],
            input.CategoryId is { } category ? [new CategoryId(category)] : [],
            [],
            HasPersonalOnly: input.DebtId is not null);
        if (await sharing.CheckReferencesAsync(input, shared, ct) is { } sharingError) return sharingError;
        if (input.Shape == RecurringBillShape.Transfer || input.CategoryId is not { } categoryId) return null;

        var flow = FlowOf(input.Shape);
        return await references.CategoryOfTypeAsync(
            new CategoryId(categoryId),
            flow,
            flow == FlowType.Income ? CategoryNotIncome : CategoryNotExpense,
            ct);
    }
}
