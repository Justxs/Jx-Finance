namespace JxFinance.Domain.Receipts;

public sealed class ReceiptReadingUsage
{
    public DateOnly Month { get; set; }
    public int Readings { get; set; }
    public long InputTokens { get; set; }
    public long OutputTokens { get; set; }

    public static DateOnly MonthOf(DateOnly day) => new(day.Year, day.Month, 1);
}
