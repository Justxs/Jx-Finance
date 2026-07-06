using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed record ImportConfirmRow(
    string ImportRef,
    DateOnly Date,
    string? Description,
    string Amount,
    FlowType Type,
    Guid? CategoryId);
