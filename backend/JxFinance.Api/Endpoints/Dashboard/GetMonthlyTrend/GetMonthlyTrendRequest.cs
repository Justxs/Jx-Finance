using JxFinance.Common.SettleUp;

namespace JxFinance.Endpoints.Dashboard.GetMonthlyTrend;

public sealed class GetMonthlyTrendRequest
{
    public int Months { get; init; } = 6;

    public string? Month { get; init; }

    public SpendingShare? Share { get; init; }
}
