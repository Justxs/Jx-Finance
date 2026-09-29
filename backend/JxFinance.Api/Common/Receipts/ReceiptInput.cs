namespace JxFinance.Common.Receipts;

public sealed record ReceiptInput(byte[] Content, string MediaType, int PagesRead, int PageCount);
