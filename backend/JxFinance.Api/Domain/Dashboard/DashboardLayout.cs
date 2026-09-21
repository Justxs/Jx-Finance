using System.Text.Json;

namespace JxFinance.Domain.Dashboard;

public sealed record DashboardLayout(IReadOnlyList<string> Order, IReadOnlyList<string> Hidden)
{
    public static IReadOnlyList<DashboardCard> DefaultOrder { get; } = Enum.GetValues<DashboardCard>();

    private static readonly Dictionary<string, DashboardCard> CardsById = DefaultOrder
        .ToDictionary(IdOf, card => card, StringComparer.Ordinal);

    public static string IdOf(DashboardCard card) => JsonNamingPolicy.CamelCase.ConvertName(card.ToString());

    public static bool TryParse(string? id, out DashboardCard card) =>
        CardsById.TryGetValue(id ?? string.Empty, out card);

    public static DashboardLayout From(IEnumerable<DashboardCard> order, IEnumerable<DashboardCard> hidden) =>
        new(order.Select(IdOf).ToList(), hidden.Select(IdOf).ToList());

    public IReadOnlyList<DashboardCard> ResolvedOrder()
    {
        var known = Known(Order).Distinct().ToList();
        return known.Concat(DefaultOrder.Except(known)).ToList();
    }

    public IReadOnlyList<DashboardCard> ResolvedHidden()
    {
        var hidden = Known(Hidden).ToHashSet();
        return ResolvedOrder().Where(hidden.Contains).ToList();
    }

    private static IEnumerable<DashboardCard> Known(IEnumerable<string> ids)
    {
        foreach (var id in ids)
        {
            if (TryParse(id, out var card)) yield return card;
        }
    }
}
