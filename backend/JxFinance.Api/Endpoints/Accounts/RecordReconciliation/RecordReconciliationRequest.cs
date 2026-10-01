using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.RecordReconciliation;

public sealed record RecordReconciliationRequest(
    Guid Id,
    DateOnly Date,
    [property: Money(NotNull = true)] decimal? Balance,
    Currency? Currency = null);
