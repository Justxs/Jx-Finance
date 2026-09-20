using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.Investments;

public sealed class InvestmentTransaction : OwnableEntity, IAccountScoped
{
    public InvestmentTransactionId Id { get; set; } = InvestmentTransactionId.New();
    public AccountId AccountId { get; set; }
    public SecurityId? SecurityId { get; set; }
    public InvestmentTransactionType Type { get; set; }
    public DateOnly Date { get; set; }
    public decimal Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal Fee { get; set; }
    public Money CashAmount { get; set; }
    public decimal ReportingAmount { get; set; }
    public string? Description { get; set; }
    public InvestmentSource Source { get; set; }
    public string? ExternalId { get; set; }
}
