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
        var owner = await CreateUserAsync();
        var partner = await CreateUserAsync();
        await CreateHouseholdAsync(owner, partner);
        using var ownerClient = await LoginAsync(owner);
        using var partnerClient = await LoginAsync(partner);
        var bill = await CreateDueBillAsync(ownerClient);
        var partnerBill = await CreateDueBillAsync(partnerClient);

        await NewJob().ScanAsync(default);

        var reminder = Assert.Single(await UnreadAsync(ownerClient));
        Assert.Equal(bill, reminder.RelatedId);
        Assert.Equal(partnerBill, Assert.Single(await UnreadAsync(partnerClient)).RelatedId);

        var foreignMark = await partnerClient.PatchAsync($"/api/notifications/{reminder.Id}/read", null);
        (await partnerClient.PostAsync("/api/notifications/read-all", null)).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.NotFound, foreignMark.StatusCode);
        Assert.Empty(await UnreadAsync(partnerClient));
        Assert.Equal(reminder.Id, Assert.Single(await UnreadAsync(ownerClient)).Id);
    }

    [Fact]
    public async Task Repeated_scans_on_one_day_remind_once_per_bill_even_after_the_reminder_was_read()
    {
        using var member = await CreateUserClientAsync();
        var first = await CreateDueBillAsync(member);
        var second = await CreateDueBillAsync(member);
        var job = NewJob();

        await job.ScanAsync(default);
        await job.ScanAsync(default);
        (await member.PostAsync("/api/notifications/read-all", null)).EnsureSuccessStatusCode();
        await job.ScanAsync(default);

        var all = await member.GetFromJsonAsync<List<NotificationDto>>("/api/notifications");
        Assert.Equal(new[] { first, second }.Order(), all!.Select(n => n.RelatedId!.Value).Order());
        Assert.All(all!, n => Assert.True(n.IsRead));
    }

    private RecurringBillReminderJob NewJob() =>
        new(Services.GetRequiredService<IServiceScopeFactory>(), NullLogger<RecurringBillReminderJob>.Instance);

    private async Task<Guid> CreateDueBillAsync(HttpClient client) =>
        (await PostAsync<IdDto>(
            client,
            "/api/recurring-bills",
            new { name = $"Due {Guid.NewGuid():N}", kind = "fixed", amount = "5.00", cadence = "monthly", nextDueDate = Today, remindDaysBefore = 0 })).Id;

    private static async Task<List<NotificationDto>> UnreadAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unread=true"))!;

    private sealed record NotificationDto(Guid Id, Guid? RelatedId, bool IsRead);
}
