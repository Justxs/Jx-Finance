using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Places;
using JxFinance.Common.Trash;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.GetPlaces;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.RenamePlace;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Transactions.Services;

[RegisterService<IPlaceService>(LifeTime.Scoped)]
public sealed class PlaceService(AppDbContext db, ICurrentUser currentUser) : IPlaceService
{
    public async Task<IReadOnlyList<PlaceSuggestionResponse>> GetSuggestionsAsync(
        GetPlacesRequest request,
        CancellationToken cancellationToken)
    {
        var own = request.Own is true;
        var rows = own ? OwnRows() : db.Transactions.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var pattern = LikePattern.Contains(request.Search.Trim());
            rows = rows.Where(t => t.Place != null && EF.Functions.ILike(t.Place, pattern, LikePattern.Escape));
        }

        var places = PlaceSpellings.Fold(await rows.SpellingsAsync(cancellationToken));
        var nearby = request is { Lat: { } lat, Lon: { } lon } ? Nearest(places, lat, lon) : null;
        var others = places.Where(place => place != nearby);
        var ranked = (own
                ? others.OrderBy(place => place.Name, StringComparer.CurrentCultureIgnoreCase)
                : others.OrderByDescending(place => place.Count).ThenBy(place => place.Name, StringComparer.CurrentCultureIgnoreCase))
            .Select(place => Suggestion(place, false));
        var listed = nearby is null ? ranked : ranked.Prepend(Suggestion(nearby, true));

        return [.. own ? listed : listed.Take(PlaceSuggestionResponse.MaxItems)];
    }

    public async Task<RenamePlaceResponse> RenameAsync(RenamePlaceRequest request, CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var stored = await OwnRows().Where(t => t.Place != null).Select(t => t.Place!).Distinct().ToListAsync(cancellationToken);
        var spellings = PlaceSpellings.Renamed(stored, request.Places, name);
        var changing = OwnRows().Where(t => spellings.Contains(t.Place!));
        var accounts = await changing.Select(t => t.AccountId).Distinct().ToListAsync(cancellationToken);
        var updated = await changing.ExecuteUpdateAsync(setters => setters.SetProperty(t => t.Place, name), cancellationToken);
        if (updated > 0)
        {
            db.Audit.Summarise(
                AuditAction.Updated,
                AuditEntityKind.Transaction,
                TrashLabel.Counted($"Place set to {name}", (updated, "transaction", "transactions")),
                updated,
                accounts: accounts);
            await db.SaveChangesAsync(cancellationToken);
        }

        await dbTransaction.CommitAsync(cancellationToken);

        return new RenamePlaceResponse(updated);
    }

    private IQueryable<Transaction> OwnRows()
    {
        var userId = currentUser.Id;
        return db.Transactions.Where(t => t.UserId == userId);
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
