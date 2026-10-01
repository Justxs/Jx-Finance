using JxFinance.Domain.Common;
using JxFinance.Endpoints.Imports.GetImportInboxStatus;
using JxFinance.Endpoints.Imports.Shared;

namespace JxFinance.Endpoints.Imports.Interfaces;

public interface IImportInboxService
{
    Task<IReadOnlyList<ImportInboxFileResponse>> ListAsync(CancellationToken cancellationToken);

    Task<Result<ImportInboxDownload>> OpenAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<Guid>> DismissAsync(Guid id, CancellationToken cancellationToken);

    ImportInboxStatusResponse GetStatus();
}
