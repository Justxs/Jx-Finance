using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Categories.CreateCategory;

public sealed class CreateCategoryEndpoint(ICategoryService categoryService)
    : Endpoint<CreateCategoryRequest, CategoryResponse>
{
    public override void Configure()
    {
        Post("/api/categories");
    }

    public override async Task HandleAsync(CreateCategoryRequest req, CancellationToken ct)
    {
        var result = await categoryService.CreateAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.ResultAsync(Results.Created($"/api/categories/{result.Value!.Id}", result.Value));
    }
}
