using FastEndpoints;

namespace JxFinance.Endpoints.RecurringBills.DeleteRecurringBill;

public sealed class DeleteRecurringBillSummary : Summary<DeleteRecurringBillEndpoint>
{
    public DeleteRecurringBillSummary()
    {
        Summary = "Delete a recurring entry";
        Description = "Removes the schedule and its reminders. Transactions and transfers already posted "
            + "from it stay in the ledger.";
        Params["id"] = "The recurring entry id.";
        Responses[204] = "The recurring entry is gone.";
        Responses[404] = "No such recurring entry belongs to the signed-in user.";
    }
}
