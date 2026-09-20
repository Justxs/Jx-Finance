using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transfers.Shared;

namespace JxFinance.Endpoints.Transfers.CreateTransfer;

public sealed record CreateTransferRequest(
    Guid FromAccountId,
    Guid ToAccountId,
    [property: Money] decimal Amount,
    DateOnly Date,
    string? Description,
    Currency? Currency = null,
    [property: Money] decimal? ReceivedAmount = null,
    Currency? ReceivedCurrency = null) : ITransferInput;
