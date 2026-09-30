using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Places;

public sealed record PlaceSpelling(
    string Name,
    int Count,
    DateOnly LastDate,
    DateTimeOffset LastCreatedAt,
    int Located,
    decimal LatitudeSum,
    decimal LongitudeSum);

public sealed record PlaceSummary(string Key, string Name, int Count, decimal? Latitude, decimal? Longitude);

public static class PlaceSpellings
{
    public static string KeyOf(string place) => place.Trim().ToLowerInvariant();

    public static Task<List<PlaceSpelling>> SpellingsAsync(this IQueryable<Transaction> rows, CancellationToken cancellationToken) =>
        rows
            .Where(t => t.Place != null)
            .GroupBy(t => t.Place!)
            .Select(group => new PlaceSpelling(
                group.Key,
                group.Count(),
                group.Max(t => t.Date),
                group.Max(t => t.CreatedAt),
                group.Count(t => t.Latitude != null),
                group.Sum(t => t.Latitude ?? 0m),
                group.Sum(t => t.Longitude ?? 0m)))
            .ToListAsync(cancellationToken);

    public static List<PlaceSummary> Fold(IEnumerable<PlaceSpelling> spellings) =>
    [
        .. spellings
            .GroupBy(spelling => KeyOf(spelling.Name))
            .Select(group =>
            {
                var newest = group.MaxBy(spelling => (spelling.LastDate, spelling.LastCreatedAt))!;
                var located = group.Sum(spelling => spelling.Located);
                return new PlaceSummary(
                    group.Key,
                    newest.Name,
                    group.Sum(spelling => spelling.Count),
                    located == 0 ? null : TransactionPlace.Round(group.Sum(spelling => spelling.LatitudeSum) / located),
                    located == 0 ? null : TransactionPlace.Round(group.Sum(spelling => spelling.LongitudeSum) / located));
            }),
    ];
}
