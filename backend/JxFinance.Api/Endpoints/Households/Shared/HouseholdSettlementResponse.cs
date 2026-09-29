using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Households.Shared;

public sealed record HouseholdSettlementResponse(
    Guid Id,
    Guid FromUserId,
    string FromName,
    Guid ToUserId,
    string ToName,
    [property: Money] decimal Amount,
    Currency Currency,
    DateOnly Date,
    string? Note,
    bool HasTransfer);
