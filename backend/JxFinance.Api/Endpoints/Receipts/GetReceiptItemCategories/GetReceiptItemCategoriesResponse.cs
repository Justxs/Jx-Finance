namespace JxFinance.Endpoints.Receipts.GetReceiptItemCategories;

public sealed record GetReceiptItemCategoriesResponse(IReadOnlyList<ReceiptItemCategoryResponse> Items, int Total)
{
    public const int MaxItems = 100;
}

public sealed record ReceiptItemCategoryResponse(Guid Id, string Key, Guid CategoryId, DateTimeOffset LastUsed);
