using System.Text.Json.Serialization;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.CreateSharedExpense;

public sealed record CreateSharedExpenseRequest(
    Guid Id,
    Guid TransactionId,
    [property: JsonRequired] SplitMethod Method,
    IReadOnlyList<ShareRequest> Shares) : ISharedExpenseInput;
