using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Households.CreateSettlement;

public sealed record CreateSettlementRequest(
    Guid Id,
    Guid FromUserId,
    Guid ToUserId,
    [property: Money] decimal Amount,
    Currency Currency,
    DateOnly Date,
    string? Note = null,
    SettlementTransferRequest? Transfer = null,
    Guid? TransferId = null);

public sealed record SettlementTransferRequest(Guid FromAccountId, Guid ToAccountId);
