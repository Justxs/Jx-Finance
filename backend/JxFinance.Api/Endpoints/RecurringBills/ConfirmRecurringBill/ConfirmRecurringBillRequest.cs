namespace JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;

public sealed record ConfirmRecurringBillRequest(Guid Id, string? Amount, Guid? AccountId);
