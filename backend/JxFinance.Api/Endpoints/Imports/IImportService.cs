using JxFinance.Domain.Common;
using JxFinance.Endpoints.Imports.Confirm;
using JxFinance.Endpoints.Imports.Preview;

namespace JxFinance.Endpoints.Imports;

public interface IImportService
{
    Task<Result<ImportPreviewResponse>> PreviewSwedbankCsvAsync(
        Guid accountId,
        Stream fileStream,
        CancellationToken cancellationToken);

    Task<Result<ImportConfirmResponse>> ConfirmAsync(ImportConfirmRequest request, CancellationToken cancellationToken);
}
