using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.RecurringBills.Shared;

public sealed record RecurringBillResponse(
    Guid Id,
    string Name,
    RecurringBillShape Shape,
    RecurringBillKind Kind,
    [property: Money] decimal? Amount,
    Guid? CategoryId,
    Guid? AccountId,
    Guid? ToAccountId,
    RecurringBillCadence Cadence,
    DateOnly NextDueDate,
    int RemindDaysBefore,
    bool IsActive,
    string? MatchKey,
    RecurringBillMatchResponse? LatestMatch,
    Guid? DebtId,
    Scope Scope,
    Guid? HouseholdId,
    int? SpreadMonths = null,
    SpreadDirection? SpreadDirection = null);
