using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Accounts.RecordReconciliation;

public sealed record RecordReconciliationRequest(Guid Id, DateOnly Date, [property: Money(NotNull = true)] decimal? Balance);
