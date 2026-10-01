namespace JxFinance.Domain.NetWorth;

public sealed class DebtBalanceEntry
{
    public const int NoteMaxLength = 200;

    public DebtId DebtId { get; set; }
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
    public string? Note { get; set; }
}
