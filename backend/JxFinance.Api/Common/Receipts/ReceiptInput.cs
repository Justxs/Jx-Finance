namespace JxFinance.Common.Receipts;

public sealed record ReceiptInput(IReadOnlyList<IReadOnlyList<byte[]>> Pages, string? Text, int PagesRead, int PageCount);
