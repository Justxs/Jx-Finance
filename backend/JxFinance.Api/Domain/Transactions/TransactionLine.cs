using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.Transactions;

public sealed class TransactionLine
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public TransactionId TransactionId { get; set; }
    public CategoryId? CategoryId { get; set; }
    public Money Amount { get; set; }
    public string? Description { get; set; }
}
