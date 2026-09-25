using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Categories.Shared;

namespace JxFinance.Endpoints.Categories.GetCategories;

public sealed class GetCategoriesEndpoint(ICategoryService categoryService)
    : EndpointWithoutRequest<IReadOnlyList<CategoryResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Categories);
        Group<CategoriesGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await categoryService.GetAllAsync(ct), ct);
}
