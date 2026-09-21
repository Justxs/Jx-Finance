using JxFinance.Common.Json;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.Shared;

public sealed record DebtScheduleResponse(
    Guid DebtId,
    DateOnly AsOf,
    [property: Money] decimal LoanAmount,
    decimal InterestRate,
    AmortizationType AmortizationType,
    [property: Money] decimal RegularPayment,
    [property: Money] decimal ScheduledBalance,
    int PaymentsMade,
    DebtSchedulePlan Plan,
    DebtSchedulePlan? WithExtra,
    [property: Money] decimal? InterestSaved,
    int? PaymentsSaved);

public sealed record DebtSchedulePlan(
    DateOnly PayoffDate,
    int Payments,
    [property: Money] decimal TotalPaid,
    [property: Money] decimal TotalInterest,
    [property: Money] decimal TotalExtra,
    IReadOnlyList<DebtScheduleRow> Rows);

public sealed record DebtScheduleRow(
    int Number,
    DateOnly Date,
    [property: Money] decimal Payment,
    [property: Money] decimal Interest,
    [property: Money] decimal Principal,
    [property: Money] decimal Extra,
    [property: Money] decimal Balance);
