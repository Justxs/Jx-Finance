using FastEndpoints;

namespace JxFinance.Endpoints.Accounts.GetReconciliationPreview;

public sealed class GetReconciliationPreviewSummary : Summary<GetReconciliationPreviewEndpoint, GetReconciliationPreviewRequest>
{
    public GetReconciliationPreviewSummary()
    {
        Summary = "Preview a reconciliation of an account";
        Description = "Answers what the ledger holds on a statement date, before the balance printed on the statement "
            + "is saved: the ledger balance on that date in the account's main currency (the starting balance plus "
            + "every transaction, transfer, conversion and investment entry dated on or before it), the latest "
            + "reconciliation dated before it, and the rows in the main currency dated after that reconciliation, or "
            + "from the beginning when there is none, up to the date, newest first, at most 100, with their count. "
            + "Nothing is stored.";
        Params["id"] = "The account id.";
        RequestParam(r => r.Date, "The statement date, as yyyy-MM-dd. Not after today.");
        Responses[200] = "The ledger balance, the previous reconciliation and the rows since it.";
        Responses[400] = "The date is missing, or after today (reconciliation.futureDate).";
        Responses[404] = "No such account is visible to the signed-in user.";
    }
}
