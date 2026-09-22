using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Categories.Mappers;
using JxFinance.Endpoints.Categories.Shared;

namespace JxFinance.Endpoints.Categories.GetCategories;

public sealed class GetCategoriesEndpoint(ICategoryService categoryService)
    : EndpointWithoutRequest<IReadOnlyList<CategoryResponse>, CategoryMapper>
{
    public override void Configure()
    {
        Get(ApiRoutes.Categories);
        Group<CategoriesGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var categories = await categoryService.GetAllAsync(ct);
        await Send.OkAsync(categories.Select(Map.FromEntity).ToList(), ct);
    }
}
