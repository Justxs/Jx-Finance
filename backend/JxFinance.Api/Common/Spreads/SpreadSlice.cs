using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;

namespace JxFinance.Common.Spreads;

public sealed record SpreadSlice(
    TransactionId Id,
    DateOnly Date,
    FlowType Type,
    CategoryId? CategoryId,
    string? PayeeKey,
    string? Place,
    IReadOnlyList<TagId> TagIds,
    decimal Amount);
