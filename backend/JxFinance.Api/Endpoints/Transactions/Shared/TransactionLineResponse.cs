using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Transactions.Shared;

public sealed record TransactionLineResponse(Guid Id, Guid? CategoryId, [property: Money] decimal Amount, string? Description);
