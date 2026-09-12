using FastEndpoints;

namespace JxFinance.Endpoints.Accounts.DeleteAccount;

public sealed class DeleteAccountSummary : Summary<DeleteAccountEndpoint>
{
    public DeleteAccountSummary()
    {
        Summary = "Archive an account";
        Description = "Archives the account instead of deleting it: the transactions posted to it stay "
            + "in the ledger and in reports, but the account no longer appears in listings or pickers.";
        Params["id"] = "The account id.";
        Responses[204] = "The account is archived.";
        Responses[404] = "No such account is visible to the signed-in user.";
    }
}
