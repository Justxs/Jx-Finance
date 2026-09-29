using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Endpoints.Imports.Shared;

namespace JxFinance.Endpoints.Imports.CreateCsvMapping;

public sealed class CreateCsvMappingEndpoint(ICsvMappingService mappingService)
    : Endpoint<CreateCsvMappingRequest, CsvMappingResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.CsvMappings);
        Group<ImportsGroup>();
        Description(d => d.ProducesCreated<CsvMappingResponse>());
    }

    public override async Task HandleAsync(CreateCsvMappingRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(await mappingService.CreateAsync(req, ct), mapping => $"{ApiRoutes.CsvMappingsPath}/{mapping.Id}", ct);
}
