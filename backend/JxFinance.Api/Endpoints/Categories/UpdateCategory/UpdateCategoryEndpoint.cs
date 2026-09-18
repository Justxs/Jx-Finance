using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Categories.Mappers;
using JxFinance.Endpoints.Categories.Shared;

namespace JxFinance.Endpoints.Categories.UpdateCategory;

public sealed class UpdateCategoryEndpoint(ICategoryService categoryService)
    : Endpoint<UpdateCategoryRequest, CategoryResponse, CategoryMapper>
{
    public override void Configure()
    {
        Put("categories/{id}");
        Group<CategoriesGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateCategoryRequest req, CancellationToken ct)
    {
        var category = (await categoryService.UpdateAsync(req.Id, entity => Map.UpdateEntity(req, entity), ct)).ValueOrThrow();
        await Send.OkAsync(Map.FromEntity(category), ct);
    }
}
