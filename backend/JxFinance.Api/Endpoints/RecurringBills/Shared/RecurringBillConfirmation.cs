using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.Shared;

public sealed record RecurringBillConfirmation(RecurringBill Bill, Guid? TransactionId, Guid? TransferId);
