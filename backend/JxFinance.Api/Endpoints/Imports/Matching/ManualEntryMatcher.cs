using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.Imports.Matching;

public sealed record StatementLine(DateOnly Date, FlowType Type, Money Amount)
{
    public Money MoneyIn => ManualEntryMatcher.MoneyIn(Type, Amount);
}

public sealed record ManualEntry(TransactionId Id, DateOnly Date, FlowType Type, Money Amount)
{
    public int DaysFrom(StatementLine line) => Math.Abs(Date.DayNumber - line.Date.DayNumber);

    public bool Fits(StatementLine line) =>
        ManualEntryMatcher.MoneyIn(Type, Amount) == line.MoneyIn && DaysFrom(line) <= ManualEntryMatcher.MaxDays;
}

public static class ManualEntryMatcher
{
    public const int MaxDays = 3;

    public static Money MoneyIn(FlowType type, Money amount) =>
        type == FlowType.Income ? amount : new Money(-amount.Amount, amount.Currency);

    public static IReadOnlyList<ManualEntry?> Match(IReadOnlyList<StatementLine?> lines, IReadOnlyList<ManualEntry> entries)
    {
        var pairs = lines
            .SelectMany((line, index) => line is null
                ? []
                : entries.Where(entry => entry.Fits(line)).Select(entry => (Index: index, Entry: entry, Days: entry.DaysFrom(line))))
            .OrderBy(pair => pair.Days)
            .ThenBy(pair => pair.Index)
            .ThenBy(pair => pair.Entry.Date)
            .ThenBy(pair => pair.Entry.Id.Value);

        var matched = new ManualEntry?[lines.Count];
        var taken = new HashSet<TransactionId>();
        foreach (var (index, entry, _) in pairs)
        {
            if (matched[index] is null && taken.Add(entry.Id))
            {
                matched[index] = entry;
            }
        }

        return matched;
    }
}
