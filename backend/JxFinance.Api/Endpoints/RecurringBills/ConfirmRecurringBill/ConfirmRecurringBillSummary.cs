using FastEndpoints;

namespace JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;

public sealed class ConfirmRecurringBillSummary : Summary<ConfirmRecurringBillEndpoint, ConfirmRecurringBillRequest>
{
    public ConfirmRecurringBillSummary()
    {
        Summary = "Confirm a due occurrence";
        Description = "Posts the transaction for one occurrence of the schedule and rolls the next due "
            + "date forward by the cadence. expectedDueDate identifies which occurrence is being "
            + "confirmed, so a retry or a double click cannot post the same bill twice.";
        ExampleRequest = new ConfirmRecurringBillRequest(Guid.Empty, 650.00m, null, new DateOnly(2026, 10, 1));
        Params["id"] = "The recurring bill id. Takes precedence over the id in the body.";
        RequestParam(r => r.Amount, "Actual amount. Required for a Variable bill; defaults to the scheduled amount for a Fixed one.");
        RequestParam(r => r.AccountId, "Account to post to. Defaults to the account on the schedule.");
        RequestParam(r => r.ExpectedDueDate, "The occurrence being confirmed; must match the schedule's next due date.");
        Responses[200] = "The posted transaction and the new next due date.";
        Responses[400] = "The due date does not match, the amount is missing, or the account is not visible to you.";
        Responses[404] = "No such recurring bill belongs to the signed-in user.";
    }
}
