using JxFinance.Common.Json;
using JxFinance.Domain.Common;
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
    DateOnly? PayoffDate,
    Currency Currency,
    bool TracksPayments,
    [property: Money] decimal? TrackedBalance,
    bool TrackedIncomplete,
    int UnavailablePayments,
    Scope Scope,
    Guid? HouseholdId,
    bool IsMine);

public sealed record DebtBalanceEntryResponse(DateOnly Date, [property: Money] decimal Amount, string? Note);
