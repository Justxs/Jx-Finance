using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Conversions.Interfaces;
using JxFinance.Endpoints.Conversions.Shared;

namespace JxFinance.Endpoints.Conversions.CreateConversion;

public sealed class CreateConversionEndpoint(IConversionService conversionService)
    : Endpoint<CreateConversionRequest, ConversionResponse>
{
    public override void Configure()
    {
        Post("conversions");
        Group<ConversionsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<ConversionResponse>(201, "application/json"));
    }

    public override async Task HandleAsync(CreateConversionRequest req, CancellationToken ct)
    {
        var conversion = (await conversionService.CreateAsync(req, ct)).ValueOrThrow();
        await Send.ResultAsync(TypedResults.Created($"/api/conversions/{conversion.Id}", conversion));
    }
}
