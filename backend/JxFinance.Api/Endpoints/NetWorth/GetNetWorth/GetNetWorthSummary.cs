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
            + "could not be valued and was left out, and no snapshot is taken then. CountsOpenBalances is your choice made "
            + "with PUT /api/networth/open-balances; while it is true, Receivable, what your households and people outside "
            + "them owe you, is inside Assets and Payable, what you owe them, is inside Debts, and the snapshot carries both. "
            + "They are zero otherwise.";
        Responses[200] = "Total assets, total debts, and net worth.";
    }
}
