using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Conversions.Interfaces;

namespace JxFinance.Endpoints.Conversions.DeleteConversion;

public sealed class DeleteConversionEndpoint(IConversionService conversionService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete("conversions/{id}");
        Group<ConversionsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        conversionService.DeleteAsync(id, ct);
}
