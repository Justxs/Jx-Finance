using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Categories.Interfaces;

namespace JxFinance.Endpoints.Categories.DeleteCategory;

public sealed class DeleteCategoryEndpoint(ICategoryService categoryService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete("categories/{id}");
        Group<CategoriesGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        categoryService.DeleteAsync(id, ct);
}
