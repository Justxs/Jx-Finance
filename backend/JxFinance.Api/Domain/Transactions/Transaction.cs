using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.Transactions;

public sealed class Transaction : OwnableEntity, IAccountScoped
{
    public TransactionId Id { get; set; } = TransactionId.New();
    public AccountId AccountId { get; set; }
    public CategoryId? CategoryId { get; set; }
    public FlowType Type { get; set; }
    public Money Amount { get; set; }
    public decimal ReportingAmount { get; set; }
    public DateOnly Date { get; set; }
    public string? Description { get; set; }
    public string? PayeeKey { get; set; }
    public TransactionSource Source { get; set; }
    public string? ImportRef { get; set; }
    public bool IsSplit { get; set; }
    public TransactionId? RefundOfTransactionId { get; set; }
    public DateTimeOffset? UnusualCheckedAt { get; set; }
    public UnusualBasis? UnusualBasis { get; set; }
    public decimal? UnusualTypicalAmount { get; set; }
    public decimal? UnusualFactor { get; set; }
    public int? UnusualSampleSize { get; set; }
    public DateTimeOffset? UnusualDismissedAt { get; set; }
}
