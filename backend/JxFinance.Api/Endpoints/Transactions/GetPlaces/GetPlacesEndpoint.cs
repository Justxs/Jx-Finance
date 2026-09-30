using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.GetPlaces;

public sealed class GetPlacesEndpoint(IPlaceService placeService)
    : Endpoint<GetPlacesRequest, IReadOnlyList<PlaceSuggestionResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Transactions + "/places");
        Group<TransactionsGroup>();
        Options(b => b.WithMetadata(new RequiresFeature(Feature.Locations)));
    }

    public override async Task HandleAsync(GetPlacesRequest req, CancellationToken ct) =>
        await Send.OkAsync(await placeService.GetSuggestionsAsync(req, ct), ct);
}
