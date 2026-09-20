using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transfers.UpdateTransfer;

public sealed record UpdateTransferRequest(
    Guid Id,
    Guid FromAccountId,
    Guid ToAccountId,
    [property: Money] decimal Amount,
    DateOnly Date,
    string? Description,
    Currency? Currency = null,
    [property: Money] decimal? ReceivedAmount = null,
    Currency? ReceivedCurrency = null);
