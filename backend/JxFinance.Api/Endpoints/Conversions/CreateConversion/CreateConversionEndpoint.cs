using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Conversions.Interfaces;
using JxFinance.Endpoints.Conversions.Shared;

namespace JxFinance.Endpoints.Conversions.CreateConversion;

public sealed class CreateConversionEndpoint(IConversionService conversionService)
    : Endpoint<CreateConversionRequest, ConversionResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Conversions);
        Group<ConversionsGroup>();
        Description(d => d.ProducesCreated<ConversionResponse>());
    }

    public override async Task HandleAsync(CreateConversionRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(await conversionService.CreateAsync(req, ct), conversion => $"{ApiRoutes.ConversionsPath}/{conversion.Id}", ct);
}
