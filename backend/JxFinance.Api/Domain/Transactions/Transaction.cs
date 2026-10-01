using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.Transactions;

public sealed class Transaction : OwnableEntity, IAccountScoped, IDated
{
    public TransactionId Id { get; set; } = TransactionId.New();
    public AccountId AccountId { get; set; }
    public CategoryId? CategoryId { get; set; }
    public FlowType Type { get; set; }
    public Money Amount { get; set; }
    public decimal ReportingAmount { get; set; }
    public DateOnly Date { get; set; }
    public string? Description { get; set; }
    public string? Note { get; set; }
    public string? PayeeKey { get; set; }
    public TransactionSource Source { get; set; }
    public string? ImportRef { get; set; }
    public bool IsSplit { get; set; }
    public TransactionId? RefundOfTransactionId { get; set; }
    public DateTimeOffset? UnusualCheckedAt { get; set; }
    public UnusualVerdict? Unusual { get; set; }
    public DateTimeOffset? UnusualDismissedAt { get; set; }
    public short? SpreadMonths { get; set; }
    public DateOnly? SpreadUntil { get; set; }
    public string? Place { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public TransactionGroupId? GroupId { get; set; }
    public List<TransactionTag> Tags { get; set; } = [];

    public void RecheckUnusual()
    {
        UnusualCheckedAt = null;
        if (IsSplit || Type != FlowType.Expense || Amount.Amount < 0)
        {
            Unusual = null;
        }
    }
}
