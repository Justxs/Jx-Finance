using FastEndpoints;

namespace JxFinance.Endpoints.Accounts.GetArchivedAccounts;

public sealed class GetArchivedAccountsSummary : Summary<GetArchivedAccountsEndpoint>
{
    public GetArchivedAccountsSummary()
    {
        Summary = "List archived accounts";
        Description = "Returns the archived accounts you would see if they were active: your own plus the "
            + "shared accounts of your households, narrowed by the active household exactly as the account "
            + "list is. Sorted by name. canRestore is true only on the accounts you own, because only the "
            + "owner archives or restores an account.";
        Responses[200] = "The archived accounts you can see.";
    }
}
