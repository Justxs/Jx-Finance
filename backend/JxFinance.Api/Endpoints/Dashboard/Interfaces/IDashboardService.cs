using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Endpoints.Dashboard.Interfaces;

public interface IDashboardService
{
    Task<DashboardSummaryResponse> GetSummaryAsync(string? month, CancellationToken cancellationToken);

    Task<CategoryBreakdownResponse> GetCategoryBreakdownAsync(string? month, CancellationToken cancellationToken);

    Task<MonthlyTrendResponse> GetMonthlyTrendAsync(int months, string? month, CancellationToken cancellationToken);
}
