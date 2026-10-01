namespace JxFinance.Domain.Transactions;

public sealed class DuplicateDismissal
{
    public TransactionId TransactionId { get; set; }
    public TransactionId OtherTransactionId { get; set; }
}
