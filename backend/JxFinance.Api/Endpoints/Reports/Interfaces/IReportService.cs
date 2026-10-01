using JxFinance.Common.SettleUp;
using JxFinance.Endpoints.Reports.Shared;

namespace JxFinance.Endpoints.Reports.Interfaces;

public interface IReportService
{
    Task<ReportSummaryResponse> GetSummaryAsync(
        DateOnly? dateFrom,
        DateOnly? dateTo,
        ReportComparisonMode comparison,
        SpendingShare share,
        CancellationToken cancellationToken);
}
