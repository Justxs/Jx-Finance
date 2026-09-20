using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.Transfers.GetTransfers;

public sealed class GetTransfersSummary : Summary<GetTransfersEndpoint, GetTransfersRequest>
{
    public GetTransfersSummary()
    {
        Summary = "List transfers";
        Description = "Returns a page of transfers between your own accounts, newest first. Transfers "
            + "are kept apart from transactions on purpose: moving money between your accounts is "
            + "neither income nor an expense and must not distort reports.";
        this.DescribePaging();
        RequestParam(r => r.Date, "Keep only transfers on this date, as YYYY-MM-DD.");
        Responses[200] = "A page of transfers with the total row count.";
    }
}
