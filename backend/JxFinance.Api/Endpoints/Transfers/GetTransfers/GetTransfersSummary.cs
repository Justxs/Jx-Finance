using FastEndpoints;

namespace JxFinance.Endpoints.Transfers.GetTransfers;

public sealed class GetTransfersSummary : Summary<GetTransfersEndpoint, GetTransfersRequest>
{
    public GetTransfersSummary()
    {
        Summary = "List transfers";
        Description = "Returns a page of transfers between your own accounts, newest first. Transfers "
            + "are kept apart from transactions on purpose: moving money between your accounts is "
            + "neither income nor an expense and must not distort reports.";
        RequestParam(r => r.Page, "One-based page number. Defaults to 1.");
        RequestParam(r => r.PageSize, "Rows per page. Defaults to 20.");
        RequestParam(r => r.Date, "Keep only transfers on this date, as YYYY-MM-DD.");
        Responses[200] = "A page of transfers with the total row count.";
    }
}
