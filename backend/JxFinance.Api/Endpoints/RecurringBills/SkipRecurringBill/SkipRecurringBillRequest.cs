namespace JxFinance.Endpoints.RecurringBills.SkipRecurringBill;

public sealed record SkipRecurringBillRequest(
    Guid Id,
    DateOnly ExpectedDueDate,
    Guid? TransactionId = null);
