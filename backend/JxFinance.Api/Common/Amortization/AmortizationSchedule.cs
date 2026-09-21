namespace JxFinance.Common.Amortization;

public sealed record AmortizationRow(
    int Number,
    DateOnly Date,
    decimal Payment,
    decimal Interest,
    decimal Principal,
    decimal Extra,
    decimal Balance);

public sealed record AmortizationSchedule(decimal Principal, decimal RegularPayment, IReadOnlyList<AmortizationRow> Rows)
{
    public DateOnly PayoffDate => Rows[^1].Date;

    public decimal TotalInterest => Rows.Sum(row => row.Interest);

    public decimal TotalExtra => Rows.Sum(row => row.Extra);

    public decimal TotalPaid => Rows.Sum(row => row.Payment + row.Extra);

    public decimal BalanceOn(DateOnly date) => Rows.LastOrDefault(row => row.Date <= date)?.Balance ?? Principal;

    public int PaymentsMadeBy(DateOnly date) => Rows.Count(row => row.Date <= date);
}
