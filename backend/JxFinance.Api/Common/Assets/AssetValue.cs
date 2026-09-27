using JxFinance.Domain.NetWorth;

namespace JxFinance.Common.Assets;

public static class AssetValue
{
    public static decimal? On(DateOnly date, IEnumerable<AssetValuation> valuations, Depreciation? terms)
    {
        var last = valuations.Where(v => v.Date <= date).MaxBy(v => v.Date);
        if (last is null || terms is null || date < terms.StartDate)
        {
            return last?.Value;
        }

        var (from, value) = Anchor(last, terms);
        var lost = MonthlyAmount(terms) * (StepsBy(terms, date) - StepsBy(terms, from));
        return Math.Max(Math.Min(value, terms.ResidualValue), value - lost);
    }

    public static decimal MonthlyAmount(Depreciation terms) =>
        Math.Ceiling((terms.StartValue - terms.ResidualValue) * 100 / terms.LifeMonths) / 100;

    public static DateOnly FullyDepreciatedOn(IEnumerable<AssetValuation> valuations, Depreciation terms)
    {
        var (from, value) = Anchor(valuations.MaxBy(v => v.Date)!, terms);
        if (value <= terms.ResidualValue)
        {
            return from;
        }

        var steps = (int)Math.Ceiling((value - terms.ResidualValue) / MonthlyAmount(terms));
        return terms.StartDate.AddMonths(StepsBy(terms, from) + steps);
    }

    public static IEnumerable<(DateOnly Date, decimal Value, bool IsValuation)> Series(
        DateOnly from,
        DateOnly to,
        IReadOnlyCollection<AssetValuation> valuations,
        Depreciation? terms)
    {
        var real = valuations.Select(v => v.Date).Where(date => date >= from && date <= to).ToHashSet();
        foreach (var date in DateWindow.Sample(from, to).Union(real).Order())
        {
            if (On(date, valuations, terms) is { } value)
            {
                yield return (date, value, real.Contains(date));
            }
        }
    }

    private static (DateOnly From, decimal Value) Anchor(AssetValuation last, Depreciation terms) =>
        last.Date >= terms.StartDate ? (last.Date, last.Value) : (terms.StartDate, terms.StartValue);

    private static int StepsBy(Depreciation terms, DateOnly date)
    {
        var months = ((date.Year - terms.StartDate.Year) * 12) + date.Month - terms.StartDate.Month;
        return terms.StartDate.AddMonths(months) > date ? months - 1 : months;
    }
}
