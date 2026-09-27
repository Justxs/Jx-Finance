using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Common.Amortization;

public sealed record TrackedPayment(Guid Id, DateOnly Date, decimal Amount, DebtPaymentKind Kind, decimal? Principal);

public sealed record TrackedPaymentRow(TrackedPayment Payment, decimal Interest, decimal Principal, decimal Overpaid, decimal Balance);

public sealed record DebtTrack(decimal Balance, IReadOnlyList<TrackedPaymentRow> Rows);

public static class DebtBalance
{
    public static DebtTrack Track(decimal anchorAmount, DateOnly anchorDate, decimal? annualRate, IEnumerable<TrackedPayment> payments)
    {
        var rate = AmortizationCalculator.MonthlyRate(annualRate ?? 0);
        var balance = anchorAmount;
        var rows = new List<TrackedPaymentRow>();
        foreach (var payment in payments.Where(p => p.Date > anchorDate).OrderBy(p => p.Date))
        {
            var interest = payment switch
            {
                { Principal: { } typed } => Math.Max(0, payment.Amount - typed),
                { Kind: DebtPaymentKind.Extra } => 0,
                _ => Math.Min(payment.Amount, Money.Round(balance * rate)),
            };
            var wanted = Math.Min(payment.Principal ?? payment.Amount - interest, payment.Amount);
            var principal = Math.Min(balance, wanted);
            balance -= principal;
            rows.Add(new TrackedPaymentRow(payment, interest, principal, wanted - principal, balance));
        }

        return new DebtTrack(balance, rows);
    }
}
