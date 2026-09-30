using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.MarketPrices;

namespace JxFinance.Endpoints.Investments.FindPriceSymbol;

public sealed class FindPriceSymbolEndpoint(IPriceSyncService priceSync)
    : EndpointWithoutRequest<IReadOnlyList<PriceSymbolCandidate>>
{
    public override void Configure()
    {
        Post(ApiRoutes.Investments + "/securities/{id:guid}/price-symbol/find");
        Group<InvestmentsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkOrProblemAsync(await priceSync.FindSymbolAsync(Route<Guid>("id"), ct), ct);
}
