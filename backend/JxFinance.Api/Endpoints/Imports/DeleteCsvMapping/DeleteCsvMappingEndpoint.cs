using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Imports.Interfaces;

namespace JxFinance.Endpoints.Imports.DeleteCsvMapping;

public sealed class DeleteCsvMappingEndpoint(ICsvMappingService mappingService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.CsvMappings + "/{id}");
        Group<ImportsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        mappingService.DeleteAsync(id, ct);
}
