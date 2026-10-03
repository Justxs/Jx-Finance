using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class LoadDemoDataSummary : Summary<LoadDemoDataEndpoint>
{
    public LoadDemoDataSummary()
    {
        Summary = "Load demo data";
        Description = "Fills the administrator's empty ledger with six months of sample accounts, transactions, budgets, "
            + "goals, recurring entries, net worth and a household, in the reporting currency, and sets demoData in the "
            + "settings. Offered only during the guided setup, so it answers 409 setup.notPending once the setup is "
            + "finished, and 409 setup.ledgerNotEmpty when the administrator already has an account.";
        Responses[204] = "The demo data is loaded.";
        Responses[409] = "The guided setup is finished, or the ledger is not empty.";
    }
}
