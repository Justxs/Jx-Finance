using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Places;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.GetPlaces;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Transactions.Services;

[RegisterService<IPlaceService>(LifeTime.Scoped)]
public sealed class PlaceService(AppDbContext db) : IPlaceService
{
    public async Task<IReadOnlyList<PlaceSuggestionResponse>> GetSuggestionsAsync(
        GetPlacesRequest request,
        CancellationToken cancellationToken)
    {
        var rows = db.Transactions.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var pattern = LikePattern.Contains(request.Search.Trim());
            rows = rows.Where(t => t.Place != null && EF.Functions.ILike(t.Place, pattern, LikePattern.Escape));
        }

        var places = PlaceSpellings.Fold(await rows.SpellingsAsync(cancellationToken));
        var nearby = request is { Lat: { } lat, Lon: { } lon } ? Nearest(places, lat, lon) : null;
        var ranked = places
            .Where(place => place != nearby)
            .OrderByDescending(place => place.Count)
            .ThenBy(place => place.Name, StringComparer.CurrentCultureIgnoreCase)
            .Select(place => Suggestion(place, false));

        return
        [
            .. (nearby is null ? ranked : ranked.Prepend(Suggestion(nearby, true))).Take(PlaceSuggestionResponse.MaxItems),
        ];
    }

    private static PlaceSummary? Nearest(IEnumerable<PlaceSummary> places, decimal latitude, decimal longitude) =>
        places
            .Where(place => place is { Latitude: not null, Longitude: not null })
            .Select(place => (Place: place, Meters: GeoDistance.Meters(latitude, longitude, place.Latitude!.Value, place.Longitude!.Value)))
            .Where(entry => entry.Meters <= TransactionPlace.NearbyMeters)
            .OrderBy(entry => entry.Meters)
            .Select(entry => entry.Place)
            .FirstOrDefault();

    private static PlaceSuggestionResponse Suggestion(PlaceSummary place, bool nearby) =>
        new(place.Name, place.Count, place.Latitude, place.Longitude, nearby);
}
