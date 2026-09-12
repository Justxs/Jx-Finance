using FastEndpoints;

namespace JxFinance.Endpoints.Accounts.GetAccount;

public sealed class GetAccountSummary : Summary<GetAccountEndpoint>
{
    public GetAccountSummary()
    {
        Summary = "Get one account";
        Description = "Returns a single account with its current balance. An account that belongs to "
            + "another user, or to a household you are not a member of, is reported as missing rather "
            + "than forbidden, so the endpoint cannot be used to probe for other people's data.";
        Params["id"] = "The account id.";
        Responses[200] = "The account.";
        Responses[404] = "No such account is visible to the signed-in user.";
    }
}
