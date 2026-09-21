using JxFinance.Common.Json;
using JxFinance.Domain.NetWorth;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.CreateDebt;

public sealed record CreateDebtRequest(
    string Name,
    DebtType Type,
    [property: Money(NotNull = true)] decimal? OutstandingAmount,
    decimal? InterestRate,
    DateOnly AsOf,
    [property: Money] decimal? LoanAmount = null,
    DateOnly? FirstPaymentDate = null,
    int? TermMonths = null,
    [property: Money] decimal? MonthlyPayment = null,
    AmortizationType? AmortizationType = null) : IDebtInput;
