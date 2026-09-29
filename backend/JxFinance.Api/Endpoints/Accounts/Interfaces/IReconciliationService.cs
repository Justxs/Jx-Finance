using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.GetReconciliationPreview;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.Interfaces;

public interface IReconciliationService
{
    Task<Result<ReconciliationPreviewResponse>> PreviewAsync(Guid accountId, DateOnly date, CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<ReconciliationResponse>>> ListAsync(Guid accountId, CancellationToken cancellationToken);

    Task<Result<ReconciliationResponse>> RecordAsync(
        Guid accountId,
        DateOnly date,
        decimal balance,
        ReconciliationSource source,
        CancellationToken cancellationToken);

    Task<Result> DeleteAsync(Guid accountId, Guid reconciliationId, CancellationToken cancellationToken);

    Task<IReadOnlyList<ReconciliationCoverage>> CoverageAsync(DateOnly monthEnd, CancellationToken cancellationToken);
}
