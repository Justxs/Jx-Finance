using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.GetReconciliationPreview;

public sealed record GetReconciliationPreviewRequest(Guid Id, DateOnly Date, Currency? Currency = null);
