using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Imports.Shared;

public sealed record ImportPreviewRow(
    string ImportRef,
    DateOnly Date,
    string? Payee,
    string? Description,
    string Amount,
    FlowType Type,
    bool IsDuplicate,
    bool LooksLikeTransfer);
