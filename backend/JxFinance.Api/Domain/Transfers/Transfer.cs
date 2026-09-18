using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.Transfers;

public sealed class Transfer : OwnableEntity
{
    public TransferId Id { get; set; } = TransferId.New();
    public AccountId FromAccountId { get; set; }
    public AccountId ToAccountId { get; set; }
    public Money Amount { get; set; }
    public Money ReceivedAmount { get; set; }
    public DateOnly Date { get; set; }
    public string? Description { get; set; }
}
