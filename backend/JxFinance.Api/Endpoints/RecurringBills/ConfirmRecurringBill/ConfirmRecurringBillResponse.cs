using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;

public sealed record ConfirmRecurringBillResponse(RecurringBillResponse Bill, Guid TransactionId);
