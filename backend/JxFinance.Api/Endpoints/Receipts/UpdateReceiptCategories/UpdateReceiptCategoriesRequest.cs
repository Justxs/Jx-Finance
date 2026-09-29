namespace JxFinance.Endpoints.Receipts.UpdateReceiptCategories;

public sealed record UpdateReceiptCategoriesRequest(Guid Id, IReadOnlyList<ReceiptItemChoice> Items);

public sealed record ReceiptItemChoice(int Index, Guid? CategoryId);
