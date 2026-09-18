using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transfers.CreateTransfer;

public sealed record CreateTransferRequest(
    Guid FromAccountId,
    Guid ToAccountId,
    string Amount,
    DateOnly Date,
    string? Description,
    Currency? Currency = null,
    string? ReceivedAmount = null,
    Currency? ReceivedCurrency = null);
