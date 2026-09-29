using System.Text.Json.Serialization;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.UpdateSharedExpense;

public sealed record UpdateSharedExpenseRequest(
    Guid Id,
    Guid ExpenseId,
    [property: JsonRequired] SplitMethod Method,
    IReadOnlyList<ShareRequest> Shares,
    bool RefreshFromTransaction = false) : ISharedExpenseInput;
