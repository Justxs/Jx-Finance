using JxFinance.Domain.Common;
using JxFinance.Endpoints.Imports.Confirm;
using JxFinance.Endpoints.Imports.Parsing;
using JxFinance.Endpoints.Imports.Preview;

namespace JxFinance.Endpoints.Imports.Interfaces;

public interface IImportService
{
    Task<Result<ImportPreviewResponse>> PreviewAsync(
        StatementFormat format,
        Guid accountId,
        Stream fileStream,
        CancellationToken cancellationToken);

    Task<Result<ImportConfirmResponse>> ConfirmAsync(ImportConfirmRequest request, CancellationToken cancellationToken);
}
