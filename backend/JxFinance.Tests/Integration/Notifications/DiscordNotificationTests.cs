using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using JxFinance.Common.Discord;
using JxFinance.Common.Errors;
using JxFinance.Domain.Notifications;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Notifications;

[Collection<NotificationsCollection>]
public sealed class DiscordNotificationTests(NotificationsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string SettingsUrl = "/api/settings/discord";
    private const string TestUrl = SettingsUrl + "/test";
    private const string KindsUrl = "/api/users/me/discord-notifications";

    private static readonly string[] BillAndBudget = ["billDue", "budgetWarning"];
    private static readonly string[] BillTwice = ["billDue", "billDue"];

    private FakeDiscordWebhookClient Discord => Services.GetRequiredService<FakeDiscordWebhookClient>();

    [Fact]
    public async Task Only_administrators_read_save_and_test_the_channel()
    {
        using var member = await CreateUserClientAsync();

        var read = await member.GetAsync(SettingsUrl, TestContext.Current.CancellationToken);
        var saved = await member.PutAsJsonAsync(SettingsUrl, new { enabled = true }, TestContext.Current.CancellationToken);
        var tested = await member.PostAsync(TestUrl, null, TestContext.Current.CancellationToken);

        Assert.All([read, saved, tested], response => Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode));
    }

    [Fact]
    public async Task The_channel_is_saved_kept_and_tested_without_ever_returning_its_url()
    {
        using var admin = await CreateUserClientAsync("Admin");
        var id = NewWebhookId();
        var token = $"token-{Guid.NewGuid():N}";
        await SaveAsync(admin, false, $"https://discord.com/api/webhooks/{id}/{token}");

        await SaveAsync(admin, false, "");
        var tested = await admin.PostAsync(TestUrl, null, TestContext.Current.CancellationToken);
        var body = await admin.GetStringAsync(SettingsUrl, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, tested.StatusCode);
        Assert.Contains("webhook works", Assert.Single(Discord.To(id)).Post.Content, StringComparison.Ordinal);
        Assert.DoesNotContain(id, body, StringComparison.Ordinal);
        Assert.DoesNotContain(token, body, StringComparison.Ordinal);
        var settings = JsonSerializer.Deserialize<DiscordDto>(body, JsonSerializerOptions.Web)!;
        Assert.Equal((false, true), (settings.Enabled, settings.HasWebhook));
        Assert.NotNull(settings.LastDeliveredAt);
    }

    [Fact]
    public async Task Without_a_webhook_the_test_is_not_found_and_discord_cannot_be_switched_on()
    {
        using var admin = await CreateUserClientAsync("Admin");
        await WithDbAsync(db => db.InstanceSettings.ExecuteUpdateAsync(
            s => s.SetProperty(x => x.DiscordEnabled, false).SetProperty(x => x.DiscordProtectedUrl, string.Empty),
            TestContext.Current.CancellationToken));

        var tested = await admin.PostAsync(TestUrl, null, TestContext.Current.CancellationToken);
        var switchedOn = await admin.PutAsJsonAsync(SettingsUrl, new { enabled = true }, TestContext.Current.CancellationToken);
        var foreign = await admin.PutAsJsonAsync(
            SettingsUrl,
            new { enabled = false, webhookUrl = "https://evil.example/api/webhooks/1/token" },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(tested, HttpStatusCode.NotFound, ErrorCodes.ResourceNotFound);
        await AssertProblemAsync(switchedOn, HttpStatusCode.BadRequest, ErrorCodes.DiscordInvalidWebhook);
        await AssertProblemAsync(foreign, HttpStatusCode.BadRequest, ErrorCodes.DiscordInvalidWebhook);
        Assert.False((await admin.GetFromJsonAsync<DiscordDto>(SettingsUrl, TestContext.Current.CancellationToken))!.HasWebhook);
    }

    [Fact]
    public async Task Members_choose_on_their_profile_which_kinds_go_to_discord()
    {
        using var member = await CreateUserClientAsync();

        var saved = await ReadOkAsync<ProfileDto>(await member.PutAsJsonAsync(
            KindsUrl,
            new { types = BillAndBudget },
            TestContext.Current.CancellationToken));
        var twice = await member.PutAsJsonAsync(KindsUrl, new { types = BillTwice }, TestContext.Current.CancellationToken);

        Assert.Equal(BillAndBudget, saved.DiscordNotificationTypes);
        await AssertProblemAsync(twice, HttpStatusCode.BadRequest, ErrorCodes.CollectionInvalidSize);
        var me = await member.GetFromJsonAsync<ProfileDto>("/api/auth/me", TestContext.Current.CancellationToken);
        Assert.Equal(BillAndBudget, me!.DiscordNotificationTypes);
    }

    [Fact]
    public async Task A_bill_reminder_reaches_the_channel_only_when_the_switch_is_on_and_the_kind_is_ticked()
    {
        using var admin = await CreateUserClientAsync("Admin");
        var webhook = await SaveWebhookAsync(admin, false);
        var switchedOff = await MemberAsync("billDue");
        var otherKind = await MemberAsync("budgetExceeded");
        var first = await MemberAsync("billDue");
        var second = await MemberAsync("billDue");
        await Seed.RecurringBillAsync(switchedOff.Client, Today, "Water");
        await ScanBillsAsync();
        await SaveAsync(admin, true);
        try
        {
            await Seed.RecurringBillAsync(otherKind.Client, Today, "Water");
            await Seed.RecurringBillAsync(first.Client, Today, "Rent *now*");
            await Seed.RecurringBillAsync(second.Client, Today, "Gym");
            await ScanBillsAsync();
            await DrainAsync();

            Assert.Equal(0, await MessageCountAsync(switchedOff.User.Id));
            Assert.Equal(0, await MessageCountAsync(otherKind.User.Id));
            var posts = Discord.To(webhook).Select(p => p.Post.Content).ToList();
            Assert.Equal(2, posts.Count);
            var rent = Assert.Single(posts, p => p.StartsWith(@"Test User · **Rent \*now\***", StringComparison.Ordinal));
            Assert.Contains("Payment due", rent, StringComparison.Ordinal);
            Assert.Contains($"<{ApiFixture.SiteUrl}/recurring-bills>", rent, StringComparison.Ordinal);
            Assert.Contains(posts, p => p.Contains("**Gym**", StringComparison.Ordinal));
            Assert.Single(await Seed.UnreadNotificationsAsync(first.Client));
        }
        finally
        {
            await SwitchOffAsync(admin);
        }
    }

    [Fact]
    public async Task Running_the_job_twice_queues_one_message() =>
        await WithChannelAsync(async (_, webhook) =>
        {
            var member = await MemberAsync("billDue");
            await Seed.RecurringBillAsync(member.Client, Today, "Internet");
            await ScanBillsAsync();
            await ScanBillsAsync();
            await DrainAsync();
            await DrainAsync();

            Assert.Single(Discord.To(webhook));
            Assert.Equal(1, await MessageCountAsync(member.User.Id));
        });

    [Fact]
    public async Task A_kind_the_member_no_longer_ticks_is_given_up() =>
        await WithChannelAsync(async (_, webhook) =>
        {
            var member = await MemberAsync("billDue");
            await Seed.RecurringBillAsync(member.Client, Today, "Phone");
            await ScanBillsAsync();
            await ChooseKindsAsync(member.Client);

            await DrainAsync();

            Assert.Empty(Discord.To(webhook));
            Assert.True((await SingleMessageAsync(member.User.Id)).IsGivenUp);
        });

    [Fact]
    public async Task Rate_limiting_reschedules_without_counting_an_attempt() =>
        await WithChannelAsync(async (_, webhook) =>
        {
            var member = await MemberAsync("billDue");
            await Seed.RecurringBillAsync(member.Client, Today, "Gym");
            await ScanBillsAsync();
            Discord.AnswerNext(
                webhook,
                DiscordSendResult.Failure(ErrorCodes.DiscordRateLimited, "slow down", TimeSpan.FromMinutes(2)));
            var before = DateTimeOffset.UtcNow;

            await DrainAsync();

            Assert.Empty(Discord.To(webhook));
            var message = await SingleMessageAsync(member.User.Id);
            Assert.Equal(0, message.Attempts);
            Assert.Null(message.SentAt);
            Assert.True(message.NextAttemptAt >= before.AddSeconds(100));
        });

    [Fact]
    public async Task Another_failure_keeps_the_message_for_a_retry_and_shows_the_error() =>
        await WithChannelAsync(async (admin, webhook) =>
        {
            var member = await MemberAsync("billDue");
            await Seed.RecurringBillAsync(member.Client, Today, "Insurance");
            await ScanBillsAsync();
            Discord.AnswerNext(webhook, DiscordSendResult.Failure(ErrorCodes.DiscordSendFailed, "Discord is down."));

            await DrainAsync();

            var message = await SingleMessageAsync(member.User.Id);
            Assert.Equal((1, false, "Discord is down."), (message.Attempts, message.IsGivenUp, message.LastError));
            var settings = await admin.GetFromJsonAsync<DiscordDto>(SettingsUrl, TestContext.Current.CancellationToken);
            Assert.Equal("Discord is down.", settings!.LastError);
            Assert.False(settings.DisabledByDiscord);
        });

    [Fact]
    public async Task A_webhook_discord_no_longer_knows_gives_up_the_queue_until_a_new_url_is_saved() =>
        await WithChannelAsync(async (admin, webhook) =>
        {
            var member = await MemberAsync("billDue");
            await Seed.RecurringBillAsync(member.Client, Today, "Rent");
            await Seed.RecurringBillAsync(member.Client, Today, "Water");
            await ScanBillsAsync();
            Discord.AnswerNext(
                webhook,
                DiscordSendResult.Failure(ErrorCodes.DiscordWebhookGone, "Discord says this webhook no longer exists."));

            await DrainAsync();
            await DrainAsync();

            Assert.Empty(Discord.To(webhook));
            var messages = await MessagesAsync(member.User.Id);
            Assert.Equal(2, messages.Count);
            Assert.All(messages, m => Assert.True(m.IsGivenUp));
            var settings = await admin.GetFromJsonAsync<DiscordDto>(SettingsUrl, TestContext.Current.CancellationToken);
            Assert.True(settings!.DisabledByDiscord);
            Assert.Contains("no longer exists", settings.LastError, StringComparison.Ordinal);
            var renewed = await SaveAsync(admin, true, $"https://discord.com/api/webhooks/{NewWebhookId()}/token");
            Assert.Equal((false, null), (renewed.DisabledByDiscord, renewed.LastError));
        });

    private async Task WithChannelAsync(Func<HttpClient, string, Task> test)
    {
        using var admin = await CreateUserClientAsync("Admin");
        var webhook = await SaveWebhookAsync(admin, true);
        try
        {
            await test(admin, webhook);
        }
        finally
        {
            await SwitchOffAsync(admin);
        }
    }

    private static async Task<string> SaveWebhookAsync(HttpClient admin, bool enabled)
    {
        var id = NewWebhookId();
        await SaveAsync(admin, enabled, $"https://discord.com/api/webhooks/{id}/token-{Guid.NewGuid():N}");
        return id;
    }

    private static async Task<DiscordDto> SaveAsync(HttpClient admin, bool enabled, string? webhookUrl = null) =>
        await ReadOkAsync<DiscordDto>(await admin.PutAsJsonAsync(
            SettingsUrl,
            new { enabled, webhookUrl },
            TestContext.Current.CancellationToken));

    private async Task SwitchOffAsync(HttpClient admin)
    {
        await SaveAsync(admin, false);
        await WithDbAsync(db => db.DiscordMessages.ExecuteDeleteAsync(TestContext.Current.CancellationToken));
    }

    private async Task<Member> MemberAsync(params string[] types)
    {
        var user = await CreateUserAsync();
        var client = await LoginAsync(user);
        await ChooseKindsAsync(client, types);
        return new Member(user, client);
    }

    private static async Task ChooseKindsAsync(HttpClient client, params string[] types) =>
        (await client.PutAsJsonAsync(KindsUrl, new { types }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

    private Task ScanBillsAsync() => Job<RecurringBillReminderJob>().RunOnceAsync(TestContext.Current.CancellationToken);

    private Task DrainAsync() => Job<DiscordOutboxJob>().RunOnceAsync(TestContext.Current.CancellationToken);

    private Task<List<DiscordMessage>> MessagesAsync(Guid userId) =>
        WithDbAsync(db => db.DiscordMessages.AsNoTracking()
            .Where(m => m.UserId == userId)
            .ToListAsync(TestContext.Current.CancellationToken));

    private async Task<DiscordMessage> SingleMessageAsync(Guid userId) => Assert.Single(await MessagesAsync(userId));

    private async Task<int> MessageCountAsync(Guid userId) => (await MessagesAsync(userId)).Count;

    private static string NewWebhookId() =>
        Random.Shared.NextInt64(1_000_000_000, long.MaxValue).ToString(CultureInfo.InvariantCulture);

    private sealed record Member(TestUser User, HttpClient Client);

    private sealed record ProfileDto(List<string> DiscordNotificationTypes);

    private sealed record DiscordDto(
        bool Enabled,
        bool HasWebhook,
        DateTimeOffset? LastDeliveredAt,
        string? LastError,
        bool DisabledByDiscord);
}
