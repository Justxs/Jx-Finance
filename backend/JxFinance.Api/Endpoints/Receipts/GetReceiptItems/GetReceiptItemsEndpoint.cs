using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Receipts.Interfaces;

namespace JxFinance.Endpoints.Receipts.GetReceiptItems;

public sealed class GetReceiptItemsEndpoint(IReceiptItemReport report)
    : Endpoint<GetReceiptItemsRequest, GetReceiptItemsResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Receipts + "/items");
        Group<ReceiptsGroup>();
    }

    public override async Task HandleAsync(GetReceiptItemsRequest req, CancellationToken ct) =>
        await Send.OkAsync(await report.GetAsync(req, ct), ct);
}
