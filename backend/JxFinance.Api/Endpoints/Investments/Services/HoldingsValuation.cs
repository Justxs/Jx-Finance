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

    private readonly Dictionary<(AccountId Account, DateOnly? AsOf), (decimal Value, bool IsComplete)?> valued = [];

    public async Task<IReadOnlyDictionary<AccountId, (decimal Value, bool IsComplete)>> ValueAsync(
        IReadOnlyCollection<AccountId> accountIds,
        DateOnly? asOf,
        CancellationToken cancellationToken)
    {
        if (!settings.Current.IsEnabled(Feature.Investments) || accountIds.Count == 0)
        {
            return new Dictionary<AccountId, (decimal Value, bool IsComplete)>();
        }

        var missing = accountIds.Where(id => !valued.ContainsKey((id, asOf))).Distinct().ToList();
        if (missing.Count > 0)
        {
            await ValueMissingAsync(missing, asOf, cancellationToken);
        }

        return accountIds
            .Distinct()
            .Where(id => valued[(id, asOf)] is not null)
            .ToDictionary(id => id, id => valued[(id, asOf)]!.Value);
    }

    private async Task ValueMissingAsync(List<AccountId> accountIds, DateOnly? asOf, CancellationToken cancellationToken)
    {
        var rows = await db.InvestmentTransactions
            .AsNoTracking()
            .Where(t => accountIds.Contains(t.AccountId) && t.SecurityId != null && PositionTypes.Contains(t.Type)
                && (asOf == null || t.Date <= asOf))
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
            valued[(id, asOf)] = null;
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
        var prices = asOf is { } day
            ? await PricesOnAsync(securityIds, day, cancellationToken)
            : securities.ToDictionary(s => s.Key, s => s.Value.LastPrice);
        var table = asOf is { } date
            ? await rates.GetForDateAsync(date, cancellationToken)
            : await rates.GetLatestAsync(cancellationToken);

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
                var value = position.Value(
                    prices.GetValueOrDefault(position.SecurityId),
                    securities[position.SecurityId].Currency,
                    table,
                    rates.ReportingCurrency);
                total += value.Reporting ?? 0m;
                isComplete &= value.IsComplete;
            }

            valued[(account.Key, asOf)] = (total, isComplete);
        }
    }

    private Task<Dictionary<SecurityId, decimal?>> PricesOnAsync(
        List<SecurityId> securityIds,
        DateOnly day,
        CancellationToken cancellationToken) =>
        db.SecurityPrices
            .AsNoTracking()
            .Where(p => securityIds.Contains(p.SecurityId)
                && p.Date == db.SecurityPrices.Where(x => x.SecurityId == p.SecurityId && x.Date <= day).Max(x => (DateOnly?)x.Date))
            .ToDictionaryAsync(p => p.SecurityId, p => (decimal?)p.Price, cancellationToken);
}
