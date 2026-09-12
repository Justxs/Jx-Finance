using FastEndpoints;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Categories.Shared;

namespace JxFinance.Endpoints.Categories.GetCategories;

public sealed class GetCategoriesEndpoint(ICategoryService categoryService)
    : EndpointWithoutRequest<IReadOnlyList<CategoryResponse>>
{
    public override void Configure()
    {
        Get("categories");
        Group<CategoriesGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var categories = await categoryService.GetAllAsync(ct);
        await Send.OkAsync(categories, ct);
    }
}
