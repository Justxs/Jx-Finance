namespace JxFinance.Common.Amortization;

public sealed record ExtraPayments(decimal Monthly = 0, decimal LumpSum = 0, DateOnly? LumpSumDate = null)
{
    public static ExtraPayments None { get; } = new();

    public bool IsNone => Monthly == 0 && LumpSum == 0;
}
