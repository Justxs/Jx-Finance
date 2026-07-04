using FastEndpoints;

namespace JxFinance.Endpoints.Categories.GetCategories;

public sealed class GetCategoriesEndpoint(ICategoryService categoryService)
    : EndpointWithoutRequest<IReadOnlyList<CategoryResponse>>
{
    public override void Configure()
    {
        Get("/api/categories");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var categories = await categoryService.GetAllAsync(ct);
        await Send.OkAsync(categories, ct);
    }
}
