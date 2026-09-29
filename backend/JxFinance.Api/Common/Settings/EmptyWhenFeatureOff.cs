namespace JxFinance.Common.Settings;

public sealed record EmptyWhenFeatureOff
{
    public static EmptyWhenFeatureOff Instance { get; } = new();
}
