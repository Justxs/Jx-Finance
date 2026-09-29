namespace JxFinance.Domain.Households;

public sealed class SharedExpenseShare
{
    public SharedExpenseId SharedExpenseId { get; set; }
    public Guid UserId { get; set; }
    public int? Weight { get; set; }
    public decimal Amount { get; set; }
}
