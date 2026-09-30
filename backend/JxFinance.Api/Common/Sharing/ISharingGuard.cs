using JxFinance.Domain.Common;

namespace JxFinance.Common.Sharing;

public interface ISharingGuard
{
    Task<DomainError?> CheckAsync(IShareableInput input, CancellationToken cancellationToken);

    Task<DomainError?> CheckAsync<T>(T existing, IShareableInput input, CancellationToken cancellationToken)
        where T : OwnableEntity, IShareable;

    Task<DomainError?> CheckReferencesAsync(IShareableInput input, SharedReferences references, CancellationToken cancellationToken);
}
