using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Conversions.Interfaces;
using JxFinance.Endpoints.Conversions.Shared;

namespace JxFinance.Endpoints.Conversions.UpdateConversion;

public sealed class UpdateConversionEndpoint(IConversionService conversionService)
    : Endpoint<UpdateConversionRequest, ConversionResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Conversions + "/{id}");
        Group<ConversionsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateConversionRequest req, CancellationToken ct)
    {
        await Send.OkOrProblemAsync(await conversionService.UpdateAsync(req, ct), ct);
    }
}
