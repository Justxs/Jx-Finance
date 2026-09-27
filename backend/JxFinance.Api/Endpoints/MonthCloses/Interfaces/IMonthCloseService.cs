using JxFinance.Domain.Common;
using JxFinance.Endpoints.MonthCloses.Shared;

namespace JxFinance.Endpoints.MonthCloses.Interfaces;

public interface IMonthCloseService
{
    Task<Result<MonthCloseYearResponse>> GetYearAsync(int? year, CancellationToken cancellationToken);

    Task<Result<MonthReviewResponse>> GetMonthAsync(string month, CancellationToken cancellationToken);

    Task<Result<MonthReviewResponse>> CloseAsync(string month, string? note, CancellationToken cancellationToken);

    Task<Result<MonthReviewResponse>> UpdateNoteAsync(string month, string? note, CancellationToken cancellationToken);

    Task<Result> ReopenAsync(string month, CancellationToken cancellationToken);
}
