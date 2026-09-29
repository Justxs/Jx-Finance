using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Endpoints.Imports.Shared;

namespace JxFinance.Endpoints.Imports.ListCsvMappings;

public sealed class ListCsvMappingsEndpoint(ICsvMappingService mappingService)
    : EndpointWithoutRequest<IReadOnlyList<CsvMappingResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.CsvMappings);
        Group<ImportsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await mappingService.GetAllAsync(ct), ct);
}
