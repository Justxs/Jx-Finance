using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Imports.Shared;

public sealed record ImportPreviewRow(
    string ImportRef,
    DateOnly Date,
    string? Payee,
    string? Description,
    [property: Money] decimal Amount,
    FlowType Type,
    bool IsDuplicate,
    bool LooksLikeTransfer,
    Currency Currency);
