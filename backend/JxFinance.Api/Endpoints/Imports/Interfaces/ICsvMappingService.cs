using JxFinance.Domain.Common;
using JxFinance.Endpoints.Imports.CreateCsvMapping;
using JxFinance.Endpoints.Imports.Shared;
using JxFinance.Endpoints.Imports.UpdateCsvMapping;

namespace JxFinance.Endpoints.Imports.Interfaces;

public interface ICsvMappingService
{
    Task<IReadOnlyList<CsvMappingResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<CsvMappingResponse>> CreateAsync(CreateCsvMappingRequest request, CancellationToken cancellationToken);

    Task<Result<CsvMappingResponse>> UpdateAsync(UpdateCsvMappingRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
