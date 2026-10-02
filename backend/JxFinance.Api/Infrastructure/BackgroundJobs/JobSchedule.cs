using Cronos;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed class JobSchedule
{
    private readonly TimeSpan interval;
    private readonly CronExpression? cron;

    private JobSchedule(TimeSpan interval, CronExpression? cron)
    {
        this.interval = interval;
        this.cron = cron;
    }

    public static JobSchedule Every(TimeSpan interval) => new(interval, null);

    public static JobSchedule Cron(string expression) => new(TimeSpan.Zero, CronExpression.Parse(expression));

    public DateTimeOffset Next(DateTimeOffset previous, DateTimeOffset now, TimeZoneInfo zone)
    {
        if (cron is null)
        {
            return previous + interval > now ? previous + interval : now;
        }

        var after = previous > now ? previous : now;
        return cron.GetNextOccurrence(after, zone)!.Value;
    }
}
