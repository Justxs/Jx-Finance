using FastEndpoints;

namespace JxFinance.Endpoints.RecurringBills.GetRecurringBills;

public sealed class GetRecurringBillsSummary : Summary<GetRecurringBillsEndpoint>
{
    public GetRecurringBillsSummary()
    {
        Summary = "List recurring entries";
        Description = "Returns your scheduled expenses, income and transfers, each with its shape, its "
            + "cadence and the date it next falls due. Inactive schedules are included so they can be "
            + "reactivated.";
        Responses[200] = "The recurring entries belonging to the signed-in user.";
    }
}
