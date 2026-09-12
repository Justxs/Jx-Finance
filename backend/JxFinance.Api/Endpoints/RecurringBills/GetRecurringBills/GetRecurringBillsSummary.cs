using FastEndpoints;

namespace JxFinance.Endpoints.RecurringBills.GetRecurringBills;

public sealed class GetRecurringBillsSummary : Summary<GetRecurringBillsEndpoint>
{
    public GetRecurringBillsSummary()
    {
        Summary = "List recurring bills";
        Description = "Returns your scheduled bills and income, each with its cadence and the date it "
            + "next falls due. Inactive schedules are included so they can be reactivated.";
        Responses[200] = "The recurring bills belonging to the signed-in user.";
    }
}
