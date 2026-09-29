using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.GetReconciliationPreview;

public sealed record ReconciliationPreviewResponse(
    DateOnly Date,
    Currency Currency,
    [property: Money] decimal LedgerBalance,
    ReconciliationResponse? Previous,
    IReadOnlyList<AccountMovementRow> Rows,
    int RowCount);
