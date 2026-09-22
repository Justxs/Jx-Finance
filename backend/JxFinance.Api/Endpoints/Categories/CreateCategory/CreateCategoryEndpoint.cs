using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
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
        Post(ApiRoutes.Categories);
        Group<CategoriesGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<CategoryResponse>(201, MediaTypeNames.Application.Json));
    }

    public override async Task HandleAsync(CreateCategoryRequest req, CancellationToken ct)
    {
        var category = Map.FromEntity((await categoryService.CreateAsync(Map.ToEntity(req), ct)).ValueOrThrow());
        await Send.ResultAsync(TypedResults.Created($"{ApiRoutes.CategoriesPath}/{category.Id}", category));
    }
}
