using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transactions.SuggestCategory;

public sealed record SuggestCategoryRequest(
    Guid AccountId,
    FlowType Type,
    [property: Money] decimal Amount,
    string Description);
