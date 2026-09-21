namespace JxFinance.Domain.Investments;

public sealed class SecurityPrice
{
    public SecurityId SecurityId { get; set; }
    public DateOnly Date { get; set; }
    public decimal Price { get; set; }
}
