using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Categories.Shared;

namespace JxFinance.Endpoints.Categories.UpdateCategory;

public sealed class UpdateCategoryEndpoint(ICategoryService categoryService)
    : Endpoint<UpdateCategoryRequest, CategoryResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Categories + "/{id}");
        Group<CategoriesGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateCategoryRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await categoryService.UpdateAsync(req, ct), ct);
}
