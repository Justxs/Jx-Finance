using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Transactions;

namespace JxFinance.Domain.Contacts;

public sealed class ContactSplit : OwnableEntity
{
    public const int DescriptionMaxLength = 200;

    public ContactSplitId Id { get; set; } = ContactSplitId.New();
    public TransactionId TransactionId { get; set; }
    public DateOnly Date { get; set; }
    public string? Description { get; set; }
    public Money Amount { get; set; }
    public SplitMethod Method { get; set; }
    public int? OwnWeight { get; set; }
    public decimal? OwnAmount { get; set; }
}
