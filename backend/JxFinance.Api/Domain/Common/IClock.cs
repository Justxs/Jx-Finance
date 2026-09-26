namespace JxFinance.Domain.Common;

public interface IClock
{
    DateTimeOffset UtcNow { get; }

    TimeZoneInfo TimeZone { get; }

    DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(UtcNow, TimeZone).DateTime);

    DateTimeOffset StartOfDay(DateOnly date);
}
