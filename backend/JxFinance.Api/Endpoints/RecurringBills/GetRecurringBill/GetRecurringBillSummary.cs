using FastEndpoints;

namespace JxFinance.Endpoints.RecurringBills.GetRecurringBill;

public sealed class GetRecurringBillSummary : Summary<GetRecurringBillEndpoint>
{
    public GetRecurringBillSummary()
    {
        Summary = "Get one recurring bill";
        Description = "Returns a single schedule with its cadence, reminder lead time, and next due date.";
        Params["id"] = "The recurring bill id.";
        Responses[200] = "The recurring bill.";
        Responses[404] = "No such recurring bill belongs to the signed-in user.";
    }
}
