using JxFinance.Common.Json;

namespace JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;

public sealed record ConfirmRecurringBillRequest(
    Guid Id,
    [property: Money] decimal? Amount,
    Guid? AccountId,
    DateOnly ExpectedDueDate,
    [property: Money] decimal? ReceivedAmount = null);
