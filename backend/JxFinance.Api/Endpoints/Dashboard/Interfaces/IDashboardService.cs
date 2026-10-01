using JxFinance.Common.SettleUp;
using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Endpoints.Dashboard.Interfaces;

public interface IDashboardService
{
    Task<DashboardSummaryResponse> GetSummaryAsync(string? month, SpendingShare share, CancellationToken cancellationToken);

    Task<CategoryBreakdownResponse> GetCategoryBreakdownAsync(string? month, SpendingShare share, CancellationToken cancellationToken);

    Task<MonthlyTrendResponse> GetMonthlyTrendAsync(int months, string? month, SpendingShare share, CancellationToken cancellationToken);
}
