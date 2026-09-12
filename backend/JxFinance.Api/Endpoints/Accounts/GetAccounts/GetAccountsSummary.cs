using FastEndpoints;

namespace JxFinance.Endpoints.Accounts.GetAccounts;

public sealed class GetAccountsSummary : Summary<GetAccountsEndpoint, GetAccountsRequest>
{
    public GetAccountsSummary()
    {
        Summary = "List accounts";
        Description = "Returns the accounts you can see: your own plus the shared accounts of your "
            + "households, each with its current balance. Filters are optional and combine with AND.";
        RequestParam(r => r.Search, "Case-insensitive match against the account name.");
        RequestParam(r => r.Iban, "Case-insensitive match against the IBAN.");
        RequestParam(r => r.Type, "Keep only accounts of this type.");
        RequestParam(r => r.Sort, "Field to sort by. Defaults to creation order.");
        RequestParam(r => r.Direction, "Asc or Desc. Defaults to Asc.");
        Responses[200] = "The accounts you can see.";
    }
}
