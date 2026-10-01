using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Imports.InspectCsv;
using JxFinance.Endpoints.Imports.Preview;

namespace JxFinance.Endpoints.Imports.Interfaces;

public interface IImportPreviewService
{
    Task<Result<ImportPreviewResponse>> PreviewAsync(
        StatementFormat format,
        Guid accountId,
        Guid? mappingId,
        Stream fileStream,
        CancellationToken cancellationToken);

    Task<Result<InspectCsvResponse>> InspectCsvAsync(
        Stream fileStream,
        CsvEncoding? encoding,
        string? delimiter,
        int? skipLines,
        CancellationToken cancellationToken);
}
