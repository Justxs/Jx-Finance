using FastEndpoints;

namespace JxFinance.Endpoints.Accounts.GetAccounts;

public sealed class GetAccountsSummary : Summary<GetAccountsEndpoint, GetAccountsRequest>
{
    public GetAccountsSummary()
    {
        Summary = "List accounts";
        Description = "Returns the accounts you can see: your own plus the shared accounts of your "
            + "households, each with its current balance. Filters are optional and combine with AND. With asOf, "
            + "the balances are as of that date instead: only rows dated on or before it count, and currencies and "
            + "holdings are valued at the exchange rates and security prices of that day. The same accounts are "
            + "returned either way.";
        RequestParam(r => r.Search, "Case-insensitive match against the account name.");
        RequestParam(r => r.Iban, "Case-insensitive match against the IBAN.");
        RequestParam(r => r.Type, "Keep only accounts of this type.");
        RequestParam(r => r.Sort, "Field to sort by. Defaults to creation order.");
        RequestParam(r => r.Direction, "Asc or Desc. Defaults to Asc.");
        RequestParam(r => r.AsOf, "Date to compute the balances at, as YYYY-MM-DD. Defaults to today.");
        Responses[200] = "The accounts you can see.";
    }
}
