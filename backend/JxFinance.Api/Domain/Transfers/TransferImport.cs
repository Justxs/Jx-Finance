using JxFinance.Domain.Accounts;

namespace JxFinance.Domain.Transfers;

public sealed class TransferImport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public AccountId AccountId { get; set; }
    public required string ImportRef { get; set; }
    public TransferId TransferId { get; set; }
}
