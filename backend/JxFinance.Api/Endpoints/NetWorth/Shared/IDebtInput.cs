using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.Shared;

public interface IDebtInput
{
    string Name { get; }
    DebtType Type { get; }
    decimal? OutstandingAmount { get; }
    decimal? InterestRate { get; }
    DateOnly AsOf { get; }
    decimal? LoanAmount { get; }
    DateOnly? FirstPaymentDate { get; }
    int? TermMonths { get; }
    decimal? MonthlyPayment { get; }
    AmortizationType? AmortizationType { get; }
}
