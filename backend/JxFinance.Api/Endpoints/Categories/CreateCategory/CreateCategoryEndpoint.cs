using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Categories.Mappers;
using JxFinance.Endpoints.Categories.Shared;

namespace JxFinance.Endpoints.Categories.CreateCategory;

public sealed class CreateCategoryEndpoint(ICategoryService categoryService)
    : Endpoint<CreateCategoryRequest, CategoryResponse, CategoryMapper>
{
    public override void Configure()
    {
        Post("categories");
        Group<CategoriesGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<CategoryResponse>(201, "application/json"));
    }

    public override async Task HandleAsync(CreateCategoryRequest req, CancellationToken ct)
    {
        var category = Map.FromEntity((await categoryService.CreateAsync(Map.ToEntity(req), ct)).ValueOrThrow());
        await Send.ResultAsync(TypedResults.Created($"/api/categories/{category.Id}", category));
    }
}
