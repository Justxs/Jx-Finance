using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Transactions.Shared;

public sealed record TransactionLineRequest(Guid? CategoryId, [property: Money] decimal Amount, string? Description);
