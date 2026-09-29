using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Endpoints.Imports.Shared;

namespace JxFinance.Endpoints.Imports.UpdateCsvMapping;

public sealed class UpdateCsvMappingEndpoint(ICsvMappingService mappingService)
    : Endpoint<UpdateCsvMappingRequest, CsvMappingResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.CsvMappings + "/{id}");
        Group<ImportsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateCsvMappingRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await mappingService.UpdateAsync(req, ct), ct);
}
