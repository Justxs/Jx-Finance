using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Conversions.Interfaces;

namespace JxFinance.Endpoints.Conversions.DeleteConversion;

public sealed class DeleteConversionEndpoint(IConversionService conversionService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("conversions/{id}");
        Group<ConversionsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await conversionService.DeleteAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
