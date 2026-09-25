using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Conversions.Interfaces;
using JxFinance.Endpoints.Conversions.Shared;

namespace JxFinance.Endpoints.Conversions.GetConversions;

public sealed class GetConversionsEndpoint(IConversionService conversionService)
    : Endpoint<GetConversionsRequest, PagedResponse<ConversionResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Conversions);
        Group<ConversionsGroup>();
    }

    public override async Task HandleAsync(GetConversionsRequest req, CancellationToken ct) =>
        await Send.OkAsync(await conversionService.GetPageAsync(req, ct), ct);
}
