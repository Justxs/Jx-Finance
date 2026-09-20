using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Common.References;

public interface IReferenceGuard
{
    Task<DomainError?> AccountExistsAsync(AccountId accountId, CancellationToken cancellationToken);

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
}
