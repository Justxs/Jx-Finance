using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transfers.Shared;

public sealed record TransferResponse(
    Guid Id,
    Guid FromAccountId,
    Guid ToAccountId,
    [property: Money] decimal Amount,
    DateOnly Date,
    string? Description,
    DateTimeOffset CreatedAt,
    Currency Currency,
    [property: Money] decimal ReceivedAmount,
    Currency ReceivedCurrency,
    bool FromAccountImported,
    bool ToAccountImported);
