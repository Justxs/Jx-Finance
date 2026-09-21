using JxFinance.Domain.Common;

namespace JxFinance.Domain.NetWorth;

public sealed class Debt : OwnableEntity
{
    public const int MaxTermMonths = 600;

    public DebtId Id { get; set; } = DebtId.New();
    public required string Name { get; set; }
    public DebtType Type { get; set; }
    public Money OutstandingAmount { get; set; }
    public decimal? InterestRate { get; set; }
    public DateOnly AsOf { get; set; }
    public Money? LoanAmount { get; set; }
    public DateOnly? FirstPaymentDate { get; set; }
    public int? TermMonths { get; set; }
    public Money? MonthlyPayment { get; set; }
    public AmortizationType AmortizationType { get; set; }
}
