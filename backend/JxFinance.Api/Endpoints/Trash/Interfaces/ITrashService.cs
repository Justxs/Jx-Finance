using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Trash.GetTrash;
using JxFinance.Endpoints.Trash.RestoreDeleted;
using JxFinance.Endpoints.Trash.Shared;

namespace JxFinance.Endpoints.Trash.Interfaces;

public interface ITrashService
{
    Task<PagedResponse<TrashEntryResponse>> GetPageAsync(GetTrashRequest request, CancellationToken cancellationToken);

    Task<Result> RestoreAsync(RestoreDeletedRequest request, CancellationToken cancellationToken);
}
