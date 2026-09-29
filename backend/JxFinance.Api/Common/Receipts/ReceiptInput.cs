namespace JxFinance.Common.Receipts;

public sealed record ReceiptInput(byte[]? Image, string? Text, int PagesRead, int PageCount);
