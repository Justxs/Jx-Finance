using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Conversions.Interfaces;
using JxFinance.Endpoints.Conversions.Shared;

namespace JxFinance.Endpoints.Conversions.UpdateConversion;

public sealed class UpdateConversionEndpoint(IConversionService conversionService)
    : Endpoint<UpdateConversionRequest, ConversionResponse>
{
    public override void Configure()
    {
        Put("conversions/{id}");
        Group<ConversionsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateConversionRequest req, CancellationToken ct)
    {
        var conversion = (await conversionService.UpdateAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(conversion, ct);
    }
}
