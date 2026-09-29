using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;

namespace JxFinance.Endpoints.Receipts.Shared;

public sealed record ReceiptReadingResponse(
    Guid Id,
    bool Cached,
    ReceiptResultResponse Result,
    IReadOnlyList<ReceiptCandidateResponse> Candidates);

public sealed record ReceiptResultResponse(
    string? Merchant,
    DateOnly? Date,
    Currency? Currency,
    [property: Money] decimal? Total,
    bool IsReturn,
    int PagesRead,
    int PageCount,
    IReadOnlyList<ReceiptItemResponse> Items,
    IReadOnlyList<ReceiptAdjustmentResponse> Adjustments,
    IReadOnlyList<string> UnreadLines);

public sealed record ReceiptItemResponse(
    string Name,
    string? Quantity,
    [property: Money] decimal Amount,
    [property: Money] decimal Discount,
    [property: Money] decimal Deposit,
    Guid? CategoryId,
    bool Remembered);

public sealed record ReceiptAdjustmentResponse(ReceiptAdjustmentKind Kind, string Label, [property: Money] decimal Amount);

public sealed record ReceiptCandidateResponse(
    Guid Id,
    Guid AccountId,
    DateOnly Date,
    string? Description,
    [property: Money] decimal Amount,
    Currency Currency);
