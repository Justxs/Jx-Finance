using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Categories.Interfaces;

public interface ICategoryService
{
    Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<Category>> CreateAsync(Category category, CancellationToken cancellationToken);

    Task<Result<Category>> UpdateAsync(Guid id, Action<Category> apply, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
