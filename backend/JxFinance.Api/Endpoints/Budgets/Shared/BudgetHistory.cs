using JxFinance.Common;

namespace JxFinance.Endpoints.Budgets.Shared;

public static class BudgetHistory
{
    public const int Windows = 6;
    public const int MinimumWindows = 3;
    public const decimal SteadyMinimumMedian = 20m;
    public const decimal SteadyMaxSpreadRatio = 0.25m;

    public static decimal? Median(IReadOnlyList<decimal> spend) =>
        spend.Count < MinimumWindows ? null : Statistics.Median(spend);

    public static decimal? SuggestedLimit(IReadOnlyList<decimal> spend) =>
        Median(spend) is { } median && median > 0m ? decimal.Ceiling(median) : null;

    public static bool IsSteady(IReadOnlyList<decimal> spend)
    {
        if (spend.Count < Windows || spend.Any(amount => amount <= 0m))
        {
            return false;
        }

        var median = Statistics.Median(spend);
        return median >= SteadyMinimumMedian && Statistics.Spread(spend, median) <= SteadyMaxSpreadRatio * median;
    }
}
