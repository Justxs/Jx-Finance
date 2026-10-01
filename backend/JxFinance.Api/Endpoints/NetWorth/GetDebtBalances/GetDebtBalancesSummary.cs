using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.GetDebtBalances;

public sealed class GetDebtBalancesSummary : Summary<GetDebtBalancesEndpoint, GetDebtBalancesRequest>
{
    public GetDebtBalancesSummary()
    {
        Summary = "List the recorded balances of a debt";
        Description = "Returns the dated outstanding amounts recorded for a debt, newest first, in the currency of the "
            + "debt. Creating or editing the debt records one, and the newest is the outstanding amount and as-of date "
            + "of the debt. Tracked payments write none: they are counted from the newest on every read.";
        Params["id"] = "The debt id.";
        Responses[200] = "The recorded balances, newest first.";
        Responses[404] = "No such debt belongs to the signed-in user.";
    }
}
