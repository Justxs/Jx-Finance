using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.GetDebts;

public sealed class GetDebtsSummary : Summary<GetDebtsEndpoint>
{
    public GetDebtsSummary()
    {
        Summary = "List debts";
        Description = "Returns the debts you track, each with its outstanding amount, optional interest "
            + "rate, and the date those figures are as of.";
        Responses[200] = "The debts belonging to the signed-in user.";
    }
}
