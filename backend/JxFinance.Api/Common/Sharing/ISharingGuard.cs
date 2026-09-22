using JxFinance.Domain.Common;

namespace JxFinance.Common.Sharing;

public interface ISharingGuard
{
    Task<DomainError?> CheckAsync<T>(T entity, SharingState? previous, CancellationToken cancellationToken)
        where T : OwnableEntity, IShareable;
}
