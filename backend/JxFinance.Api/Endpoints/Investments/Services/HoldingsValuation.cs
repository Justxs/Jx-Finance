using FastEndpoints;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Settings;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Investments.Services;

[RegisterService<IHoldingsValuation>(LifeTime.Scoped)]
public sealed class HoldingsValuation(AppDbContext db, IExchangeRateService rates, IInstanceSettingsStore settings)
    : IHoldingsValuation
{
    private static readonly InvestmentTransactionType[] PositionTypes =
    [
        InvestmentTransactionType.Buy,
        InvestmentTransactionType.Sell,
        InvestmentTransactionType.Split,
    ];

    private readonly Dictionary<AccountId, (decimal Value, bool IsComplete)?> valued = [];

    public async Task<IReadOnlyDictionary<AccountId, (decimal Value, bool IsComplete)>> ValueAsync(
        IReadOnlyCollection<AccountId> accountIds,
        CancellationToken cancellationToken)
    {
        if (!settings.Current.IsEnabled(Feature.Investments) || accountIds.Count == 0)
        {
            return new Dictionary<AccountId, (decimal Value, bool IsComplete)>();
        }

        var missing = accountIds.Where(id => !valued.ContainsKey(id)).Distinct().ToList();
        if (missing.Count > 0)
        {
            await ValueMissingAsync(missing, cancellationToken);
        }

        return accountIds
            .Distinct()
            .Where(id => valued[id] is not null)
            .ToDictionary(id => id, id => valued[id]!.Value);
    }

    private async Task ValueMissingAsync(List<AccountId> accountIds, CancellationToken cancellationToken)
    {
        var rows = await db.InvestmentTransactions
            .AsNoTracking()
            .Where(t => accountIds.Contains(t.AccountId) && t.SecurityId != null && PositionTypes.Contains(t.Type))
            .Select(t => new
            {
                t.AccountId,
                t.SecurityId,
                t.Type,
                t.Date,
                t.CreatedAt,
                t.Quantity,
                Cash = t.CashAmount.Amount,
                t.CashAmount.Currency,
                t.ReportingAmount,
            })
            .ToListAsync(cancellationToken);

        foreach (var id in accountIds)
        {
            valued[id] = null;
        }

        if (rows.Count == 0)
        {
            return;
        }

        var securityIds = rows.Select(t => t.SecurityId!.Value).Distinct().ToList();
        var securities = await db.Securities
            .AsNoTracking()
            .Where(s => securityIds.Contains(s.Id))
            .Select(s => new { s.Id, s.LastPrice, s.Currency })
            .ToDictionaryAsync(s => s.Id, cancellationToken);
        var latest = await rates.GetLatestAsync(cancellationToken);

        foreach (var account in rows.GroupBy(t => t.AccountId))
        {
            var entries = account.Select(t => new InvestmentTransaction
            {
                AccountId = t.AccountId,
                SecurityId = t.SecurityId,
                Type = t.Type,
                Date = t.Date,
                CreatedAt = t.CreatedAt,
                Quantity = t.Quantity,
                CashAmount = new Money(t.Cash, t.Currency),
                ReportingAmount = t.ReportingAmount,
            });

            var total = 0m;
            var isComplete = true;
            foreach (var position in Portfolio.Positions(entries).Values.Where(p => p.Quantity != 0m))
            {
                var security = securities[position.SecurityId];
                var value = position.Value(security.LastPrice, security.Currency, latest, rates.ReportingCurrency);
                total += value.Reporting ?? 0m;
                isComplete &= value.IsComplete;
            }

            valued[account.Key] = (total, isComplete);
        }
    }
}
