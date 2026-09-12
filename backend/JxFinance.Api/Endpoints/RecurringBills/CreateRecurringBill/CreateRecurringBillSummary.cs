using FastEndpoints;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.CreateRecurringBill;

public sealed class CreateRecurringBillSummary : Summary<CreateRecurringBillEndpoint, CreateRecurringBillRequest>
{
    public CreateRecurringBillSummary()
    {
        Summary = "Create a recurring bill";
        Description = "Schedules a bill or a recurring income. Nothing is posted to the ledger on a "
            + "schedule: the background job raises a reminder before the due date, and a transaction is "
            + "only written once the occurrence is confirmed.";
        ExampleRequest = new CreateRecurringBillRequest(
            "Rent",
            RecurringBillKind.Fixed,
            "650.00",
            null,
            null,
            RecurringBillCadence.Monthly,
            new DateOnly(2026, 10, 1),
            3);
        RequestParam(r => r.Kind, "Fixed when the amount is always the same; Variable when it changes each time.");
        RequestParam(r => r.Amount, "Expected amount. Required for a Fixed bill, optional for a Variable one.");
        RequestParam(r => r.Cadence, "Weekly, Monthly, Quarterly, or Yearly.");
        RequestParam(r => r.NextDueDate, "The next date the bill falls due, as YYYY-MM-DD.");
        RequestParam(r => r.RemindDaysBefore, "How many days ahead of the due date to raise a notification.");
        Responses[201] = "The recurring bill was created. The Location header points at it.";
        Responses[400] = "Validation failed, or the account or category is not visible to you.";
    }
}
