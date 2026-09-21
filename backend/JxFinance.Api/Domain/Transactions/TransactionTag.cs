using JxFinance.Domain.Tags;

namespace JxFinance.Domain.Transactions;

public sealed class TransactionTag
{
    public TransactionId TransactionId { get; set; }
    public TagId TagId { get; set; }
}
