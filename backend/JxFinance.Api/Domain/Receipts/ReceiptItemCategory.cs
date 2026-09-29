using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.Receipts;

public sealed class ReceiptItemCategory : OwnableEntity
{
    public const int MaxPerUser = 5000;

    public ReceiptItemCategoryId Id { get; set; } = ReceiptItemCategoryId.New();
    public required string Key { get; set; }
    public CategoryId CategoryId { get; set; }
}
