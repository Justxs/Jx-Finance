using FastEndpoints;

namespace JxFinance.Endpoints.Accounts.GetAccounts;

public sealed class GetAccountsSummary : Summary<GetAccountsEndpoint>
{
    public GetAccountsSummary()
    {
        Summary = "List accounts";
        Description = "Returns every account you can see: your own personal accounts plus the shared "
            + "accounts of the households you belong to. Archived accounts are left out. Each account "
            + "carries its starting balance and the balance derived from the transactions posted to it.";
        Responses[200] = "The accounts visible to the signed-in user, newest first.";
    }
}
