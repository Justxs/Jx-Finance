using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Categories.DeleteCategory;

public sealed class DeleteCategoryEndpoint(ICategoryService categoryService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/api/categories/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await categoryService.DeleteAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
