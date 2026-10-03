using JxFinance.Common.Errors;
using JxFinance.Common.Trash;
using JxFinance.Domain.Common;
using JxFinance.Domain.Trash;

namespace JxFinance.Endpoints.NetWorth.Services;

internal static class OwnerDeletion
{
    public static Task<DomainError?> CheckAsync(
        OwnableEntity entity,
        Guid callerId,
        IDeletionRecorder deletions,
        TrashKind kind,
        Guid id,
        string name,
        string forbidden)
    {
        if (entity.UserId != callerId)
        {
            return Task.FromResult<DomainError?>(new DomainError(ErrorCodes.AccessForbidden, forbidden));
        }

        deletions.Record(kind, id, name);
        return Task.FromResult<DomainError?>(null);
    }
}
