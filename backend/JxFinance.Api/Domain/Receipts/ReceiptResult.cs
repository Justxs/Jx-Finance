using JxFinance.Domain.Common;

namespace JxFinance.Domain.Receipts;

public sealed record ReceiptResult(
    string? Merchant,
    DateOnly? Date,
    Currency? Currency,
    decimal? Total,
    bool IsReturn,
    int PagesRead,
    int PageCount,
    IReadOnlyList<ReceiptItem> Items,
    IReadOnlyList<ReceiptAdjustment> Adjustments)
{
    public const int MaxItems = 200;
    public const int MaxAdjustments = 20;
    public const int TextMaxLength = 200;
    public const int QuantityMaxLength = 40;
}

public sealed record ReceiptItem(
    string Name,
    string? Quantity,
    decimal Amount,
    decimal Discount,
    decimal Deposit,
    Guid? CategoryId = null,
    bool Remembered = false);

public sealed record ReceiptAdjustment(ReceiptAdjustmentKind Kind, string Label, decimal Amount);

public enum ReceiptAdjustmentKind
{
    Discount,
    Voucher,
    Rounding,
    Other,
}
