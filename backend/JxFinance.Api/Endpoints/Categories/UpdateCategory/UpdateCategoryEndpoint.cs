using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Categories.UpdateCategory;

public sealed class UpdateCategoryEndpoint(ICategoryService categoryService)
    : Endpoint<UpdateCategoryRequest, CategoryResponse>
{
    public override void Configure()
    {
        Put("/api/categories/{id}");
        AllowAnonymous();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateCategoryRequest req, CancellationToken ct)
    {
        var result = await categoryService.UpdateAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
