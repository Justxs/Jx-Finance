using JxFinance.Infrastructure.BackgroundJobs;

namespace JxFinance.Tests.Unit;

public sealed class JobScheduleTests
{
    private static readonly TimeZoneInfo Vilnius = TimeZoneInfo.FindSystemTimeZoneById("Europe/Vilnius");

    private static DateTimeOffset Utc(int month, int day, int hour, int minute = 0) =>
        new(2026, month, day, hour, minute, 0, TimeSpan.Zero);

    [Fact]
    public void An_interval_counts_from_the_previous_due_time()
    {
        var schedule = JobSchedule.Every(TimeSpan.FromHours(1));

        Assert.Equal(Utc(10, 2, 11), schedule.Next(Utc(10, 2, 10), Utc(10, 2, 10, 5), Vilnius));
    }

    [Fact]
    public void An_interval_pass_that_overran_runs_again_at_once()
    {
        var schedule = JobSchedule.Every(TimeSpan.FromMinutes(15));

        Assert.Equal(Utc(10, 2, 10, 20), schedule.Next(Utc(10, 2, 10), Utc(10, 2, 10, 20), Vilnius));
    }

    [Fact]
    public void A_cron_schedule_runs_at_the_local_time_of_the_installation()
    {
        var schedule = JobSchedule.Cron("0 8 * * *");

        Assert.Equal(Utc(10, 3, 5), schedule.Next(Utc(10, 2, 10), Utc(10, 2, 10), Vilnius));
    }

    [Fact]
    public void A_cron_pass_that_woke_early_does_not_run_the_same_occurrence_twice()
    {
        var schedule = JobSchedule.Cron("0 8 * * *");
        var due = Utc(10, 3, 5);

        Assert.Equal(Utc(10, 4, 5), schedule.Next(due, due.AddMilliseconds(-10), Vilnius));
    }

    [Fact]
    public void A_cron_time_skipped_by_daylight_saving_runs_at_the_transition()
    {
        var schedule = JobSchedule.Cron("0 3 * * *");

        Assert.Equal(Utc(3, 29, 1), schedule.Next(Utc(3, 28, 12), Utc(3, 28, 12), Vilnius));
    }

    [Fact]
    public void A_cron_time_repeated_by_daylight_saving_runs_once()
    {
        var schedule = JobSchedule.Cron("0 3 * * *");
        var first = schedule.Next(Utc(10, 24, 12), Utc(10, 24, 12), Vilnius);

        Assert.Equal(Utc(10, 25, 0), first);
        Assert.Equal(Utc(10, 26, 1), schedule.Next(first, first.AddMinutes(1), Vilnius));
    }
}
