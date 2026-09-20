namespace JxFinance.Domain.Common;

public interface IClock
{
    DateTimeOffset UtcNow { get; }

    TimeZoneInfo TimeZone { get; }

    DateOnly Today { get; }

    DateTimeOffset StartOfDay(DateOnly date);
}
