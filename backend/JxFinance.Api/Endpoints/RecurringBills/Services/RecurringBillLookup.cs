using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Common.Unusual;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.RecurringBills.Mappers;
using JxFinance.Endpoints.RecurringBills.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.RecurringBills.Services;

internal sealed class RecurringBillLookup(AppDbContext db, IInstanceSettingsStore settings, IClock clock, ICurrentUser currentUser)
{
    public static readonly DomainError NotFound = EntityLookup.NotFound("Recurring entry not found.");

    public async Task<Dictionary<RecurringBillId, RecurringBillMatchResponse>> LatestMatchesAsync(
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
        var charges = await PriceRiseMatcher.LoadChargesAsync(db.Transactions, accountIds, keys, clock.Today, FlowType.Expense, cancellationToken);

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

    public async Task<RecurringBillResponse> ResponseAsync(RecurringBill bill, CancellationToken cancellationToken) =>
        bill.ToResponse((await LatestMatchesAsync([bill], cancellationToken)).GetValueOrDefault(bill.Id), currentUser.Id);

    public Task<RecurringBill?> FindAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        return db.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId, cancellationToken);
    }

    public static FlowType FlowOf(RecurringBillShape shape) =>
        shape == RecurringBillShape.Income ? FlowType.Income : FlowType.Expense;
}
