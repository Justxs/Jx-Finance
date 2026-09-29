using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Imports.Confirm;
using JxFinance.Endpoints.Imports.InspectCsv;
using JxFinance.Endpoints.Imports.Parsing;
using JxFinance.Endpoints.Imports.Preview;

namespace JxFinance.Endpoints.Imports.Interfaces;

public interface IImportService
{
    Task<Result<ImportPreviewResponse>> PreviewAsync(
        StatementFormat format,
        Guid accountId,
        Guid? mappingId,
        Stream fileStream,
        CancellationToken cancellationToken);

    Task<Result<ImportConfirmResponse>> ConfirmAsync(ImportConfirmRequest request, CancellationToken cancellationToken);

    Task<Result<InspectCsvResponse>> InspectCsvAsync(
        Stream fileStream,
        CsvEncoding? encoding,
        string? delimiter,
        int? skipLines,
        CancellationToken cancellationToken);
}
