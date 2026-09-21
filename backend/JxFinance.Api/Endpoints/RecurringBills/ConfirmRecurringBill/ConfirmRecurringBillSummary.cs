using FastEndpoints;

namespace JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;

public sealed class ConfirmRecurringBillSummary : Summary<ConfirmRecurringBillEndpoint, ConfirmRecurringBillRequest>
{
    public ConfirmRecurringBillSummary()
    {
        Summary = "Confirm a due occurrence";
        Description = "Posts one occurrence of the schedule and rolls the next due date forward by the "
            + "cadence. An Expense writes an expense transaction, an Income writes an income transaction "
            + "and a Transfer writes a transfer between the two accounts on the entry. expectedDueDate "
            + "identifies which occurrence is being confirmed, so a retry or a double click cannot post "
            + "the same occurrence twice.";
        ExampleRequest = new ConfirmRecurringBillRequest(Guid.Empty, 650.00m, null, new DateOnly(2026, 10, 1));
        Params["id"] = "The recurring entry id. Takes precedence over the id in the body.";
        RequestParam(r => r.Amount, "Actual amount. Required for a Variable entry; defaults to the scheduled amount for a Fixed one.");
        RequestParam(r => r.AccountId, "Account to post to. Ignored by a Transfer, which uses the two accounts on the entry.");
        RequestParam(r => r.ExpectedDueDate, "The occurrence being confirmed; must match the schedule's next due date.");
        RequestParam(r => r.ReceivedAmount, "What arrives in the destination account. Required when a Transfer crosses two currencies.");
        Responses[200] = "The posted transaction or transfer and the new next due date.";
        Responses[400] = "The amount is missing, a currency pair needs a received amount, or an account is not visible to you.";
        Responses[404] = "No such recurring entry belongs to the signed-in user.";
    }
}
