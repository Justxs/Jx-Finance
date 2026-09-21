using FastEndpoints;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Investments;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Holdings;

[RegisterService<IHoldingLedger>(LifeTime.Scoped)]
public sealed class HoldingLedger(AppDbContext db) : IHoldingLedger
{
    public async Task<InvestmentTransactionId?> FirstOversoldSaleAsync(
        AccountId accountId,
        SecurityId securityId,
        Func<IEnumerable<InvestmentTransaction>, IEnumerable<InvestmentTransaction>> change,
        CancellationToken cancellationToken)
    {
        var history = await db.InvestmentTransactions
            .AsNoTracking()
            .Where(t => t.AccountId == accountId && t.SecurityId == securityId)
            .ToListAsync(cancellationToken);
        if (Portfolio.Positions(history).GetValueOrDefault(securityId)?.IsOversold == true)
        {
            return null;
        }

        return Portfolio.Positions(change(history)).GetValueOrDefault(securityId)?.FirstOversoldSale;
    }
}
