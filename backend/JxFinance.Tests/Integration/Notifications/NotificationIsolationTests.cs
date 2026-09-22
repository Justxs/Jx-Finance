using System.Net;
using System.Net.Http.Json;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace JxFinance.Tests.Integration.Notifications;

[Collection<IntegrationCollection>]
public sealed class NotificationIsolationTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_reminder_reaches_only_the_owner_of_the_bill_and_only_the_owner_can_mark_it_read()
    {
        using var pair = await CreateHouseholdPairAsync();
        var (_, _, ownerClient, partnerClient, _) = pair;
        var bill = await CreateDueBillAsync(ownerClient);
        var partnerBill = await CreateDueBillAsync(partnerClient);

        await NewJob().ScanAsync(TestContext.Current.CancellationToken);

        var reminder = Assert.Single(await Seed.UnreadNotificationsAsync(ownerClient));
        Assert.Equal(bill, reminder.RelatedId);
        Assert.Equal(partnerBill, Assert.Single(await Seed.UnreadNotificationsAsync(partnerClient)).RelatedId);

        var foreignMark = await partnerClient.PatchAsync($"/api/notifications/{reminder.Id}/read", null, TestContext.Current.CancellationToken);
        (await partnerClient.PostAsync("/api/notifications/read-all", null, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.NotFound, foreignMark.StatusCode);
        Assert.Empty(await Seed.UnreadNotificationsAsync(partnerClient));
        Assert.Equal(reminder.Id, Assert.Single(await Seed.UnreadNotificationsAsync(ownerClient)).Id);
    }

    [Fact]
    public async Task Repeated_scans_on_one_day_remind_once_per_bill_even_after_the_reminder_was_read()
    {
        using var member = await CreateUserClientAsync();
        var first = await CreateDueBillAsync(member);
        var second = await CreateDueBillAsync(member);
        var job = NewJob();

        await job.ScanAsync(TestContext.Current.CancellationToken);
        await job.ScanAsync(TestContext.Current.CancellationToken);
        (await member.PostAsync("/api/notifications/read-all", null, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        await job.ScanAsync(TestContext.Current.CancellationToken);

        var all = await member.GetFromJsonAsync<List<NotificationDto>>("/api/notifications", TestContext.Current.CancellationToken);
        Assert.Equal(new[] { first, second }.Order(), all!.Select(n => n.RelatedId!.Value).Order());
        Assert.All(all!, n => Assert.True(n.IsRead));
    }

    private RecurringBillReminderJob NewJob() =>
        new(Services.GetRequiredService<IServiceScopeFactory>(), NullLogger<RecurringBillReminderJob>.Instance);

    private Task<Guid> CreateDueBillAsync(HttpClient client) => Seed.RecurringBillAsync(client, Today);
}
