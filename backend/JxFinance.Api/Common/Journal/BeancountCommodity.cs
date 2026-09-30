using System.Text.RegularExpressions;
using JxFinance.Domain.Common;

namespace JxFinance.Common.Journal;

public static partial class BeancountCommodity
{
    private const int ShortId = 8;
    private const int LongId = 23;

    private static readonly HashSet<string> CurrencyCodes =
        Enum.GetValues<Currency>().Select(currency => currency.ToCode()).ToHashSet(StringComparer.Ordinal);

    public static IReadOnlyDictionary<Guid, string> Names(IEnumerable<(Guid Id, string Symbol)> securities)
    {
        var symbols = securities.Select(s => (s.Id, Symbol: s.Symbol.Trim().ToUpperInvariant())).ToList();
        var shared = symbols.GroupBy(s => s.Symbol, StringComparer.Ordinal).Where(g => g.Count() > 1).Select(g => g.Key).ToHashSet(StringComparer.Ordinal);
        var usable = symbols
            .Where(s => IsValid(s.Symbol) && !CurrencyCodes.Contains(s.Symbol) && !shared.Contains(s.Symbol))
            .ToDictionary(s => s.Id, s => s.Symbol);
        var taken = usable.Values.ToHashSet(StringComparer.Ordinal);
        foreach (var id in symbols.Select(s => s.Id).Where(id => !usable.ContainsKey(id)).Order())
        {
            var hex = id.ToString("N").ToUpperInvariant();
            var name = $"X{hex[..ShortId]}";
            usable[id] = taken.Add(name) ? name : $"X{hex[..LongId]}";
        }

        return usable;
    }

    public static bool IsValid(string commodity) => Pattern().IsMatch(commodity);

    [GeneratedRegex(@"^[A-Z][A-Z0-9'._-]{0,22}[A-Z0-9]$", RegexOptions.CultureInvariant)]
    private static partial Regex Pattern();
}
