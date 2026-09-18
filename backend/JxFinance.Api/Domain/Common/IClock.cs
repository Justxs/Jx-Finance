namespace JxFinance.Domain.Common;

public interface IClock
{
    DateTimeOffset UtcNow { get; }

    TimeZoneInfo TimeZone { get; }

    DateTimeOffset ToAppTime(DateTimeOffset instant);

    DateOnly Today { get; }
}
