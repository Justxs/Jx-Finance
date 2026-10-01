using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed record ImportConfirmRow(
    string ImportRef,
    DateOnly Date,
    string? Description,
    [property: Money] decimal Amount,
    FlowType Type,
    Guid? CategoryId,
    Guid? TransferAccountId = null,
    Guid? ExistingTransferId = null,
    Currency? Currency = null,
    IReadOnlyList<Guid>? TagIds = null,
    Guid? ExistingTransactionId = null,
    bool AsRefund = false,
    Guid? RefundOfTransactionId = null,
    string? Payee = null,
    int? SpreadMonths = null,
    SpreadDirection? SpreadDirection = null);
