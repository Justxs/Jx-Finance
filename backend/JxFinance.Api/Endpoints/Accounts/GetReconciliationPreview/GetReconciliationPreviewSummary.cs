using FastEndpoints;

namespace JxFinance.Endpoints.Accounts.GetReconciliationPreview;

public sealed class GetReconciliationPreviewSummary : Summary<GetReconciliationPreviewEndpoint, GetReconciliationPreviewRequest>
{
    public GetReconciliationPreviewSummary()
    {
        Summary = "Preview a reconciliation of an account";
        Description = "Answers what the ledger holds on a statement date in one currency of the account, before the "
            + "balance printed on the statement is saved: the ledger balance on that date in that currency (the "
            + "starting balance when it is the main currency, plus every transaction, transfer, conversion and "
            + "investment entry in that currency dated on or before it), the latest reconciliation in that currency "
            + "dated before it, and the rows in that currency dated after that reconciliation, or from the beginning "
            + "when there is none, up to the date, newest first, at most 100, with their count. Nothing is stored.";
        Params["id"] = "The account id.";
        RequestParam(r => r.Date, "The statement date, as yyyy-MM-dd. Not after today.");
        RequestParam(r => r.Currency, "Optional. The currency of the statement; the account's main currency when left out.");
        Responses[200] = "The ledger balance, the previous reconciliation and the rows since it.";
        Responses[400] = "The date is missing or after today (reconciliation.futureDate), or the currency is unknown (enum.invalid).";
        Responses[404] = "No such account is visible to the signed-in user.";
    }
}
