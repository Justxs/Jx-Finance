using FastEndpoints;

namespace JxFinance.Endpoints.Accounts.RestoreAccount;

public sealed class RestoreAccountSummary : Summary<RestoreAccountEndpoint>
{
    public RestoreAccountSummary()
    {
        Summary = "Restore an archived account";
        Description = "Brings an archived account back into listings, pickers and totals. Archiving only hid "
            + "the account, so everything posted to it (transactions, transfers, conversions, investment "
            + "entries, recurring entries, goals funded from it) reappears with it unchanged. An account "
            + "that is still shared into a household its owner no longer belongs to comes back personal. "
            + "Only the owner can restore. Restoring an account that is already active changes nothing and "
            + "still answers 200, so it is safe to repeat.";
        Params["id"] = "The account id.";
        Responses[200] = "The account, active, with its current balance.";
        Responses[403] = "The account is shared with you but you do not own it.";
        Responses[404] = "No such account, archived or active, is visible to the signed-in user.";
    }
}
