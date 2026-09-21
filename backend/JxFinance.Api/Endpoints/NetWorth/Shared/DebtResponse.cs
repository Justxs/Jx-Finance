using JxFinance.Common.Json;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.Shared;

public sealed record DebtResponse(
    Guid Id,
    string Name,
    DebtType Type,
    [property: Money] decimal OutstandingAmount,
    decimal? InterestRate,
    DateOnly AsOf,
    [property: Money] decimal? LoanAmount,
    DateOnly? FirstPaymentDate,
    int? TermMonths,
    [property: Money] decimal? MonthlyPayment,
    AmortizationType AmortizationType,
    DateOnly? PayoffDate);
