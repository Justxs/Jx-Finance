using JxFinance.Domain.Receipts;

namespace JxFinance.Common.Receipts;

public sealed record ReceiptExtraction(
    ReceiptResult Result,
    IReadOnlyList<int?> ItemCategories,
    int InputTokens,
    int OutputTokens);
