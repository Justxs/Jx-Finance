using FastEndpoints;

namespace JxFinance.Endpoints.RecurringBills.GetRecurringBill;

public sealed class GetRecurringBillSummary : Summary<GetRecurringBillEndpoint>
{
    public GetRecurringBillSummary()
    {
        Summary = "Get one recurring entry";
        Description = "Returns a single schedule with its shape, cadence, reminder lead time, and next due date.";
        Params["id"] = "The recurring entry id.";
        Responses[200] = "The recurring entry.";
        Responses[404] = "No such recurring entry belongs to the signed-in user.";
    }
}
