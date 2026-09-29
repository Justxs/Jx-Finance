using JxFinance.Common.Json;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.Shared;

public sealed record ReconciliationResponse(
    Guid Id,
    DateOnly Date,
    [property: Money] decimal Balance,
    Currency Currency,
    ReconciliationSource Source,
    [property: Money] decimal LedgerBalance,
    [property: Money] decimal Difference,
    DateTimeOffset CreatedAt);
