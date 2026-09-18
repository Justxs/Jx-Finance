using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transfers.Shared;

public sealed record TransferResponse(
    Guid Id,
    Guid FromAccountId,
    Guid ToAccountId,
    string Amount,
    DateOnly Date,
    string? Description,
    DateTimeOffset CreatedAt,
    Currency Currency,
    string ReceivedAmount,
    Currency ReceivedCurrency);
