using JxFinance.Common.Json;
using JxFinance.Domain.Common;

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
    Currency? Currency = null);
