using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Receipts.Interfaces;

namespace JxFinance.Endpoints.Receipts.UpdateReceiptCategories;

public sealed class UpdateReceiptCategoriesEndpoint(IReceiptService receiptService)
    : Endpoint<UpdateReceiptCategoriesRequest>
{
    public override void Configure()
    {
        Put(ApiRoutes.Receipts + "/{id}/categories");
        Group<ReceiptsGroup>();
        Description(d => d.Produces(204).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateReceiptCategoriesRequest req, CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await receiptService.UpdateCategoriesAsync(req.Id, req.Items, ct), ct);
}
