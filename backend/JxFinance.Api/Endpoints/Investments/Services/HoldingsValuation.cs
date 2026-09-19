using FastEndpoints;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Settings;
using JxFinance.Domain.Accounts;
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
    public async Task<IReadOnlyDictionary<AccountId, (decimal Value, bool IsComplete)>> ValueAsync(
        IReadOnlyCollection<AccountId> accountIds,
        CancellationToken cancellationToken)
    {
        var values = new Dictionary<AccountId, (decimal Value, bool IsComplete)>();
        if (!settings.Current.IsEnabled(Feature.Investments) || accountIds.Count == 0)
        {
            return values;
        }

        var trades = await db.InvestmentTransactions
            .AsNoTracking()
            .Where(t => accountIds.Contains(t.AccountId) && t.SecurityId != null)
            .ToListAsync(cancellationToken);
        if (trades.Count == 0)
        {
            return values;
        }

        var securityIds = trades.Select(t => t.SecurityId!.Value).Distinct().ToList();
        var securities = await db.Securities
            .AsNoTracking()
            .Where(s => securityIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, cancellationToken);
        var latest = await rates.GetLatestAsync(cancellationToken);

        foreach (var account in trades.GroupBy(t => t.AccountId))
        {
            var total = 0m;
            var isComplete = true;
            foreach (var position in Portfolio.Positions(account).Values.Where(p => p.Quantity != 0m))
            {
                var security = securities[position.SecurityId];
                var value = security.LastPrice is { } price
                    ? latest.Convert(position.Quantity * price, security.Currency, rates.ReportingCurrency)
                    : null;
                total += value ?? 0m;
                isComplete &= value is not null && !position.IsOversold;
            }

            values[account.Key] = (total, isComplete);
        }

        return values;
    }
}
