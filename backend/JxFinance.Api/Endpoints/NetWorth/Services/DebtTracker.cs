using JxFinance.Common.Amortization;
using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.NetWorth.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.NetWorth.Services;

internal static class DebtTracker
{
    public static async Task<Dictionary<DebtId, DebtTracking>> TrackAsync(
        AppDbContext db,
        IExchangeRateService rates,
        IReadOnlyCollection<Debt> debts,
        CancellationToken cancellationToken)
    {
        var tracking = debts.Where(d => d.TracksPayments).ToList();
        if (tracking.Count == 0)
        {
            return [];
        }

        var ids = tracking.Select(d => d.Id).ToList();
        var links = await db.DebtPayments.AsNoTracking()
            .Where(p => ids.Contains(p.DebtId))
            .LeftJoin(db.Transactions.AsNoTracking(), p => p.TransactionId, t => t.Id, (payment, transaction) => new { Link = payment, Transaction = transaction })
            .OrderBy(l => l.Link.CreatedAt)
            .ToListAsync(cancellationToken);
        var currencies = tracking.ToDictionary(d => d.Id, d => d.Currency);
        var byDebt = links.ToLookup(l => l.Link.DebtId);
        var foreign = links
            .Where(l => l.Transaction is not null && l.Transaction.Amount.Currency != currencies[l.Link.DebtId])
            .Select(l => l.Transaction!.Date)
            .ToList();
        var history = foreign.Count == 0 ? null : await rates.GetHistoryAsync(foreign.Min(), foreign.Max(), cancellationToken);

        return tracking.ToDictionary(debt => debt.Id, debt =>
        {
            var mine = byDebt[debt.Id].ToList();
            var paying = mine.Where(l => PaysDebt(l.Transaction)).ToList();
            var visible = paying.ToDictionary(l => l.Link.Id.Value, l => l.Transaction!);
            var payments = new List<TrackedPayment>();
            var incomplete = false;
            foreach (var link in paying)
            {
                var paid = link.Transaction!.Amount;
                var amount = paid.Currency == debt.Currency ? paid.Amount : history!.OnOrBefore(link.Transaction.Date).Convert(paid.Amount, paid.Currency, debt.Currency);
                if (amount is { } value)
                {
                    payments.Add(new TrackedPayment(link.Link.Id.Value, link.Transaction.Date, Money.Round(value), link.Link.Kind, link.Link.Principal));
                }
                else
                {
                    incomplete |= link.Transaction.Date > debt.AsOf;
                }
            }

            var track = DebtBalance.Track(debt.OutstandingAmount.Amount, debt.AsOf, debt.InterestRate, payments);
            return new DebtTracking(track, incomplete, mine.Count - visible.Count, visible);
        });
    }

    private static bool PaysDebt(Transaction? transaction) => transaction is { Type: FlowType.Expense, IsSplit: false, Amount.Amount: > 0 };
}
