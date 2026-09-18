using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Categories.Interfaces;

namespace JxFinance.Endpoints.Categories.DeleteCategory;

public sealed class DeleteCategoryEndpoint(ICategoryService categoryService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("categories/{id}");
        Group<CategoriesGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await categoryService.DeleteAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
