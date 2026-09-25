using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Categories.Shared;

namespace JxFinance.Endpoints.Categories.CreateCategory;

public sealed class CreateCategoryEndpoint(ICategoryService categoryService)
    : Endpoint<CreateCategoryRequest, CategoryResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Categories);
        Group<CategoriesGroup>();
        Description(d => d.ProducesCreated<CategoryResponse>());
    }

    public override async Task HandleAsync(CreateCategoryRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(await categoryService.CreateAsync(req, ct), category => $"{ApiRoutes.CategoriesPath}/{category.Id}", ct);
}
