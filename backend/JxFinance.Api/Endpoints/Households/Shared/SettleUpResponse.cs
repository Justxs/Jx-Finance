using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Households.Shared;

public sealed record SettleUpResponse(
    IReadOnlyList<MemberBalanceResponse> Balances,
    IReadOnlyList<SuggestedPaymentResponse> Payments);

public sealed record MemberBalanceResponse(
    Guid UserId,
    string Name,
    bool IsMember,
    Currency Currency,
    [property: Money] decimal Amount);

public sealed record SuggestedPaymentResponse(
    Guid FromUserId,
    string FromName,
    Guid ToUserId,
    string ToName,
    Currency Currency,
    [property: Money] decimal Amount);
