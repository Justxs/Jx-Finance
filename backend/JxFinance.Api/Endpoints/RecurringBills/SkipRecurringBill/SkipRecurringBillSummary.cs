using FastEndpoints;

namespace JxFinance.Endpoints.RecurringBills.SkipRecurringBill;

public sealed class SkipRecurringBillSummary : Summary<SkipRecurringBillEndpoint, SkipRecurringBillRequest>
{
    public SkipRecurringBillSummary()
    {
        Summary = "Mark a due occurrence as done";
        Description = "Rolls the next due date forward by the cadence without writing a transaction or a transfer, "
            + "for an occurrence a bank row already paid or one deliberately skipped, and marks the entry's unread "
            + "reminders read. expectedDueDate identifies the occurrence, as it does for a confirmation. When the entry "
            + "pays a debt that tracks payments and transactionId names a visible expense that pays no debt yet, that "
            + "row is linked to the debt as a regular payment, as a confirmation links the row it writes.";
        ExampleRequest = new SkipRecurringBillRequest(Guid.Empty, new DateOnly(2026, 10, 1));
        Params["id"] = "The recurring entry id. Takes precedence over the id in the body.";
        RequestParam(r => r.ExpectedDueDate, "The occurrence being marked done; must match the schedule's next due date.");
        RequestParam(r => r.TransactionId, "The ledger row that paid the occurrence, when known; only used to link a debt payment.");
        Responses[200] = "The entry with its new next due date.";
        Responses[400] = "The entry is inactive.";
        Responses[404] = "No such recurring entry is visible to you.";
        Responses[409] = "conflict.stale when the occurrence was already confirmed or marked done.";
    }
}
