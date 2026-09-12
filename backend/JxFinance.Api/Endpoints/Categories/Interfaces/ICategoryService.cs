using JxFinance.Domain.Common;
using JxFinance.Endpoints.Categories.CreateCategory;
using JxFinance.Endpoints.Categories.Shared;
using JxFinance.Endpoints.Categories.UpdateCategory;

namespace JxFinance.Endpoints.Categories.Interfaces;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<CategoryResponse>> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken);

    Task<Result<CategoryResponse>> UpdateAsync(UpdateCategoryRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
