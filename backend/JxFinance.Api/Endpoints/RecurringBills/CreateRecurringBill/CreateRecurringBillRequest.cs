using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.CreateRecurringBill;

public sealed record CreateRecurringBillRequest(
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
    string? MatchKey = null,
    Guid? DebtId = null,
    Scope Scope = Scope.Personal,
    Guid? HouseholdId = null,
    int? SpreadMonths = null,
    SpreadDirection? SpreadDirection = null) : IRecurringBillInput;
