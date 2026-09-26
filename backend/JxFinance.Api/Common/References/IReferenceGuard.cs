using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Common.References;

public interface IReferenceGuard
{
    Task<DomainError?> AccountExistsAsync(AccountId accountId, CancellationToken cancellationToken);

    Task<Result<Currency>> AccountCurrencyAsync(AccountId accountId, CancellationToken cancellationToken);

    Task<DomainError?> CategoryExistsAsync(CategoryId categoryId, CancellationToken cancellationToken);

    Task<DomainError?> CategoryOfTypeAsync(
        CategoryId categoryId,
        FlowType type,
        string wrongTypeMessage,
        CancellationToken cancellationToken);

    Task<DomainError?> CategoryOfTypeAsync(
        CategoryId categoryId,
        FlowType type,
        DomainError unavailable,
        CancellationToken cancellationToken);

    Task<DomainError?> TagsExistAsync(IEnumerable<Guid> tagIds, CancellationToken cancellationToken);
}
