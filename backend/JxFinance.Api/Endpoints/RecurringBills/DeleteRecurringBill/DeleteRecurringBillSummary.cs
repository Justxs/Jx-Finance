using FastEndpoints;

namespace JxFinance.Endpoints.RecurringBills.DeleteRecurringBill;

public sealed class DeleteRecurringBillSummary : Summary<DeleteRecurringBillEndpoint>
{
    public DeleteRecurringBillSummary()
    {
        Summary = "Delete a recurring bill";
        Description = "Removes the schedule and its reminders. Transactions already posted from it stay "
            + "in the ledger.";
        Params["id"] = "The recurring bill id.";
        Responses[204] = "The recurring bill is gone.";
        Responses[404] = "No such recurring bill belongs to the signed-in user.";
    }
}
