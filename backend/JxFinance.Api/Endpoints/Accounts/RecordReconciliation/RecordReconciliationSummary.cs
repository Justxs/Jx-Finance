using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.Accounts.RecordReconciliation;

public sealed class RecordReconciliationSummary : Summary<RecordReconciliationEndpoint, RecordReconciliationRequest>
{
    public RecordReconciliationSummary()
    {
        Summary = "Record a statement balance for an account";
        Description = "Saves the balance a bank statement printed for the account on a date, in one currency the "
            + "account holds, whether or not it agrees with the ledger. A balance already recorded for that date and "
            + "currency, typed or imported, is replaced, and its source becomes manual. Anyone who can see the account "
            + "can record one.";
        Params["id"] = "The account id.";
        RequestParam(r => r.Date, "The statement date, as yyyy-MM-dd. Not after today.");
        RequestParam(r => r.Balance, "The balance on the statement, a signed decimal string with at most two decimal places.");
        RequestParam(r => r.Currency, "Optional. The currency of the statement; the account's main currency when left out.");
        Responses[200] = "The saved reconciliation with today's ledger balance and difference.";
        Responses[400] = SummaryText.ValidationFailed;
        Responses[404] = "No such account is visible to the signed-in user.";
    }
}
