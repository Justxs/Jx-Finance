namespace JxFinance.Common.Receipts;

public sealed record ReceiptInput(IReadOnlyList<byte[]> Bands, string? Text, int PagesRead, int PageCount);
