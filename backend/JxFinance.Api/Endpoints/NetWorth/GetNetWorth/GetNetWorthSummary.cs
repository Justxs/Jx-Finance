using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.GetNetWorth;

public sealed class GetNetWorthSummary : Summary<GetNetWorthEndpoint>
{
    public GetNetWorthSummary()
    {
        Summary = "Get current net worth";
        Description = "Returns assets, debts, and the difference between them as of now. Account "
            + "balances count towards assets, so cash in the ledger and tracked assets are not double "
            + "counted against each other. Every total is in the reporting currency; assets and debts are converted "
            + "from their own currency at today's rate. IsComplete is false when a balance, holding, asset or debt "
            + "could not be valued and was left out, and no snapshot is taken then.";
        Responses[200] = "Total assets, total debts, and net worth.";
    }
}
