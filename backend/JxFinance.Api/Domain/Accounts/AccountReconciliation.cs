using JxFinance.Domain.Common;

namespace JxFinance.Domain.Accounts;

public sealed class AccountReconciliation : OwnableEntity, IAccountScoped
{
    public AccountReconciliationId Id { get; set; } = AccountReconciliationId.New();
    public AccountId AccountId { get; set; }
    public Currency Currency { get; set; }
    public DateOnly Date { get; set; }
    public decimal Balance { get; set; }
    public ReconciliationSource Source { get; set; }
}
