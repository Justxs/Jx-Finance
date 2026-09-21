using JxFinance.Domain.Common;
using JxFinance.Endpoints.RecurringBills.DismissSubscriptionCandidate;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.Interfaces;

public interface ISubscriptionDetectionService
{
    Task<IReadOnlyList<SubscriptionCandidateResponse>> DetectAsync(CancellationToken cancellationToken);

    Task<Result<Guid>> DismissAsync(
        DismissSubscriptionCandidateRequest request,
        CancellationToken cancellationToken);
}
