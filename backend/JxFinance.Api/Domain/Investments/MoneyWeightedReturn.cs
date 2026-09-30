namespace JxFinance.Domain.Investments;

public static class MoneyWeightedReturn
{
    public const int MinimumDays = 30;

    private const double Lowest = -0.9999;
    private const double Highest = 100.0;
    private const int Iterations = 200;

    public static decimal? Annualized(IReadOnlyList<(DateOnly Date, decimal Amount)> flows)
    {
        var dated = flows.Where(flow => flow.Amount != 0m).ToList();
        if (!dated.Any(flow => flow.Amount < 0m) || !dated.Any(flow => flow.Amount > 0m))
        {
            return null;
        }

        var first = dated.Min(flow => flow.Date);
        if (dated.Max(flow => flow.Date).DayNumber - first.DayNumber < MinimumDays)
        {
            return null;
        }

        var points = dated
            .Select(flow => (Years: (flow.Date.DayNumber - first.DayNumber) / 365.0, Amount: (double)flow.Amount))
            .ToList();

        double PresentValue(double rate) => points.Sum(point => point.Amount / Math.Pow(1.0 + rate, point.Years));

        var (low, high) = (Lowest, Highest);
        var lowValue = PresentValue(low);
        if (Math.Sign(lowValue) == Math.Sign(PresentValue(high)))
        {
            return null;
        }

        for (var iteration = 0; iteration < Iterations; iteration++)
        {
            var middle = (low + high) / 2.0;
            var middleValue = PresentValue(middle);
            if (Math.Sign(middleValue) == Math.Sign(lowValue))
            {
                (low, lowValue) = (middle, middleValue);
            }
            else
            {
                high = middle;
            }
        }

        return decimal.Round((decimal)((low + high) / 2.0), 4);
    }
}
