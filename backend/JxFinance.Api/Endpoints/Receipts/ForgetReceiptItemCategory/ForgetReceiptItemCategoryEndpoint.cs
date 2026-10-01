using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Receipts.Interfaces;

namespace JxFinance.Endpoints.Receipts.ForgetReceiptItemCategory;

public sealed class ForgetReceiptItemCategoryEndpoint(IReceiptItemCategoryService itemCategories) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Receipts + "/item-categories/{id}");
        Group<ReceiptsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        itemCategories.ForgetAsync(id, ct);
}
