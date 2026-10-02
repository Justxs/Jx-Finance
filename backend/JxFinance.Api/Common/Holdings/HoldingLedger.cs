using FastEndpoints;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Investments;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Holdings;

[RegisterService<IHoldingLedger>(LifeTime.Scoped)]
public sealed class HoldingLedger(AppDbContext db) : IHoldingLedger
{
    public async Task<IReadOnlyCollection<InvestmentTransactionId>> NewlyOversoldAsync(
        AccountId accountId,
        Func<IEnumerable<InvestmentTransaction>, IEnumerable<InvestmentTransaction>> change,
        CancellationToken cancellationToken)
    {
        var history = await db.InvestmentTransactions
            .AsNoTracking()
            .Where(t => t.AccountId == accountId && t.SecurityId != null && Portfolio.PositionTypes.Contains(t.Type))
            .ToListAsync(cancellationToken);
        var before = Portfolio.Positions(history);

        return Portfolio.Positions(change(history)).Values
            .Where(position => before.GetValueOrDefault(position.SecurityId)?.IsOversold != true)
            .Select(position => position.FirstOversoldSale)
            .OfType<InvestmentTransactionId>()
            .ToList();
    }
}
