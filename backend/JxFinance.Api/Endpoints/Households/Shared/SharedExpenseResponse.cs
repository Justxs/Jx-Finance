using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;

namespace JxFinance.Endpoints.Households.Shared;

public sealed record SharedExpenseResponse(
    Guid Id,
    Guid PayerId,
    string PayerName,
    DateOnly Date,
    string? Description,
    [property: Money] decimal Amount,
    Currency Currency,
    SplitMethod Method,
    IReadOnlyList<ShareResponse> Shares,
    [property: Money] decimal? MyShare,
    bool Counted,
    Guid? TransactionId,
    bool? AmountDiffers);

public sealed record ShareResponse(Guid UserId, string Name, int? Weight, [property: Money] decimal Amount);
