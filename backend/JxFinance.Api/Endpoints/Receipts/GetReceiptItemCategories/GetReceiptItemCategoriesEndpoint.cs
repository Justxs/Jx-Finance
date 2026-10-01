using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Receipts.Interfaces;

namespace JxFinance.Endpoints.Receipts.GetReceiptItemCategories;

public sealed class GetReceiptItemCategoriesEndpoint(IReceiptItemCategoryService itemCategories)
    : Endpoint<GetReceiptItemCategoriesRequest, GetReceiptItemCategoriesResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Receipts + "/item-categories");
        Group<ReceiptsGroup>();
    }

    public override async Task HandleAsync(GetReceiptItemCategoriesRequest req, CancellationToken ct) =>
        await Send.OkAsync(await itemCategories.GetAsync(req, ct), ct);
}
