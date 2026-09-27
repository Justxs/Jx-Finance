using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Common.Discord;
using JxFinance.Common.Errors;
using JxFinance.Domain.Notifications;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Notifications;

[Collection<IntegrationCollection>]
public sealed class DiscordNotificationTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string DiscordUrl = "/api/users/me/discord";

    private static readonly string[] BillDueOnly = ["billDue"];

    private FakeDiscordWebhookClient Discord => Services.GetRequiredService<FakeDiscordWebhookClient>();

    [Fact]
    public async Task A_bill_reminder_reaches_discord_only_when_the_switch_the_webhook_and_the_kind_are_all_on()
    {
        var switchedOff = await MemberWithWebhookAsync(["billDue"]);
        var webhookOff = await MemberWithWebhookAsync(["billDue"], isEnabled: false);
        var otherKind = await MemberWithWebhookAsync(["budgetExceeded"]);
        var subscribed = await MemberWithWebhookAsync(["billDue"]);

        await SetDiscordAsync(false);
        await Seed.RecurringBillAsync(switchedOff.Client, Today, "Water");
        await ScanBillsAsync();
        await SetDiscordAsync(true);
        try
        {
            await Seed.RecurringBillAsync(webhookOff.Client, Today, "Water");
            await Seed.RecurringBillAsync(otherKind.Client, Today, "Water");
            await Seed.RecurringBillAsync(subscribed.Client, Today, "Rent *now*");
            await ScanBillsAsync();
            await DrainAsync();

            Assert.Empty(Discord.To(switchedOff.WebhookId));
            Assert.Empty(Discord.To(webhookOff.WebhookId));
            Assert.Empty(Discord.To(otherKind.WebhookId));
            var post = Assert.Single(Discord.To(subscribed.WebhookId)).Post;
            Assert.Contains(@"**Rent \*now\***", post.Content, StringComparison.Ordinal);
            Assert.Contains("Payment due", post.Content, StringComparison.Ordinal);
            Assert.Contains($"<{ApiFixture.SiteUrl}/recurring-bills>", post.Content, StringComparison.Ordinal);
            Assert.Single(await Seed.UnreadNotificationsAsync(subscribed.Client));
        }
        finally
        {
            await SetDiscordAsync(false);
        }
    }

    [Fact]
    public async Task A_budget_alert_reaches_discord()
    {
        var member = await MemberWithWebhookAsync(["budgetWarning", "budgetExceeded"]);
        var account = await CreateAccountAsync("1000.00", client: member.Client);
        var category = await CreateCategoryAsync(client: member.Client);
        await PostAsync<IdDto>(
            member.Client,
            "/api/budgets",
            new { categoryId = category, limitAmount = "100.00", period = "weekly", rolloverEnabled = false });
        await PostAsync<IdDto>(
            member.Client,
            "/api/transactions",
            new { accountId = account, categoryId = category, type = "expense", amount = "120.00", date = Today });

        await SetDiscordAsync(true);
        try
        {
            await Job<BudgetAlertJob>().RunOnceAsync(TestContext.Current.CancellationToken);
            await DrainAsync();

            var contents = Discord.To(member.WebhookId).Select(p => p.Post.Content).ToList();
            Assert.Equal(2, contents.Count);
            Assert.Contains(contents, c => c.Contains("Weekly limit reached", StringComparison.Ordinal));
            Assert.Contains(contents, c => c.Contains("Weekly limit: 80% used", StringComparison.Ordinal));
        }
        finally
        {
            await SetDiscordAsync(false);
        }
    }

    [Fact]
    public async Task Running_the_job_twice_queues_one_message()
    {
        var member = await MemberWithWebhookAsync(["billDue"]);
        await SetDiscordAsync(true);
        try
        {
            await Seed.RecurringBillAsync(member.Client, Today, "Internet");
            await ScanBillsAsync();
            await ScanBillsAsync();
            await DrainAsync();
            await DrainAsync();

            Assert.Single(Discord.To(member.WebhookId));
            Assert.Equal(1, await MessageCountAsync(member.User.Id));
        }
        finally
        {
            await SetDiscordAsync(false);
        }
    }

    [Fact]
    public async Task Rate_limiting_reschedules_without_counting_an_attempt()
    {
        var member = await MemberWithWebhookAsync(["billDue"]);
        await SetDiscordAsync(true);
        try
        {
            await Seed.RecurringBillAsync(member.Client, Today, "Gym");
            await ScanBillsAsync();
            Discord.AnswerNext(
                member.WebhookId,
                DiscordSendResult.Failure(ErrorCodes.DiscordRateLimited, "slow down", TimeSpan.FromMinutes(2)));
            var before = DateTimeOffset.UtcNow;

            await DrainAsync();

            Assert.Empty(Discord.To(member.WebhookId));
            var message = await SingleMessageAsync(member.User.Id);
            Assert.Equal(0, message.Attempts);
            Assert.Null(message.SentAt);
            Assert.True(message.NextAttemptAt >= before.AddSeconds(100));
        }
        finally
        {
            await SetDiscordAsync(false);
        }
    }

    [Fact]
    public async Task A_webhook_discord_no_longer_knows_is_marked_and_its_queue_given_up()
    {
        var member = await MemberWithWebhookAsync(["billDue"]);
        await SetDiscordAsync(true);
        try
        {
            await Seed.RecurringBillAsync(member.Client, Today, "Rent");
            await Seed.RecurringBillAsync(member.Client, Today, "Water");
            await ScanBillsAsync();
            Discord.AnswerNext(
                member.WebhookId,
                DiscordSendResult.Failure(ErrorCodes.DiscordWebhookGone, "Discord says this webhook no longer exists."));

            await DrainAsync();
            await DrainAsync();

            Assert.Empty(Discord.To(member.WebhookId));
            var messages = await MessagesAsync(member.User.Id);
            Assert.Equal(2, messages.Count);
            Assert.All(messages, m => Assert.True(m.IsGivenUp));
            var settings = await member.Client.GetFromJsonAsync<DiscordDto>(DiscordUrl, TestContext.Current.CancellationToken);
            Assert.True(settings!.DisabledByDiscord);
            Assert.Contains("no longer exists", settings.LastError, StringComparison.Ordinal);
        }
        finally
        {
            await SetDiscordAsync(false);
        }
    }

    [Fact]
    public async Task A_new_url_applies_to_messages_already_queued()
    {
        var member = await MemberWithWebhookAsync(["billDue"]);
        await SetDiscordAsync(true);
        try
        {
            await Seed.RecurringBillAsync(member.Client, Today, "Phone");
            await ScanBillsAsync();
            var newId = NewWebhookId();
            await SaveWebhookAsync(member.Client, WebhookUrl(newId), ["billDue"]);

            await DrainAsync();

            Assert.Empty(Discord.To(member.WebhookId));
            Assert.Single(Discord.To(newId));
        }
        finally
        {
            await SetDiscordAsync(false);
        }
    }

    [Fact]
    public async Task Removing_the_webhook_drops_its_queue()
    {
        var member = await MemberWithWebhookAsync(["billDue"]);
        await SetDiscordAsync(true);
        try
        {
            await Seed.RecurringBillAsync(member.Client, Today, "Parking");
            await ScanBillsAsync();

            var removed = await member.Client.DeleteAsync(DiscordUrl, TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
            Assert.Equal(0, await MessageCountAsync(member.User.Id));
            var settings = await member.Client.GetFromJsonAsync<DiscordDto>(DiscordUrl, TestContext.Current.CancellationToken);
            Assert.False(settings!.HasWebhook);
        }
        finally
        {
            await SetDiscordAsync(false);
        }
    }

    [Fact]
    public async Task The_test_button_is_refused_while_the_installation_switch_is_off()
    {
        var member = await MemberWithWebhookAsync(["billDue"]);
        await SetDiscordAsync(false);

        var response = await member.Client.PostAsync($"{DiscordUrl}/test", null, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, ErrorCodes.DiscordDisabled);
        Assert.Empty(Discord.To(member.WebhookId));
    }

    [Fact]
    public async Task The_test_button_posts_right_away_when_allowed()
    {
        var member = await MemberWithWebhookAsync([]);
        await SetDiscordAsync(true);
        try
        {
            var response = await member.Client.PostAsync($"{DiscordUrl}/test", null, TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            var post = Assert.Single(Discord.To(member.WebhookId)).Post;
            Assert.Contains("webhook works", post.Content, StringComparison.Ordinal);
            var settings = await member.Client.GetFromJsonAsync<DiscordDto>(DiscordUrl, TestContext.Current.CancellationToken);
            Assert.NotNull(settings!.LastDeliveredAt);
        }
        finally
        {
            await SetDiscordAsync(false);
        }
    }

    [Fact]
    public async Task Reading_the_settings_never_returns_the_url()
    {
        var member = await MemberWithWebhookAsync(["billDue"]);

        var body = await member.Client.GetStringAsync(DiscordUrl, TestContext.Current.CancellationToken);

        Assert.DoesNotContain(member.Token, body, StringComparison.Ordinal);
        Assert.DoesNotContain(member.WebhookId, body, StringComparison.Ordinal);
        Assert.Contains("\"hasWebhook\":true", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Saving_keeps_the_stored_url_when_none_is_sent()
    {
        var member = await MemberWithWebhookAsync(["billDue"]);
        await SaveWebhookAsync(member.Client, null, ["budgetExceeded"], isEnabled: false);
        await SetDiscordAsync(true);
        try
        {
            var response = await member.Client.PostAsync($"{DiscordUrl}/test", null, TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            Assert.Single(Discord.To(member.WebhookId));
            var settings = await member.Client.GetFromJsonAsync<DiscordDto>(DiscordUrl, TestContext.Current.CancellationToken);
            Assert.False(settings!.IsEnabled);
            Assert.Equal(["budgetExceeded"], settings.Types);
        }
        finally
        {
            await SetDiscordAsync(false);
        }
    }

    [Fact]
    public async Task Urls_outside_discord_are_refused()
    {
        using var member = await CreateUserClientAsync();

        var response = await member.PutAsJsonAsync(
            DiscordUrl,
            new { webhookUrl = "https://evil.example/api/webhooks/1/token", isEnabled = true, types = BillDueOnly },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, ErrorCodes.DiscordInvalidWebhook);
    }

    [Fact]
    public async Task The_first_save_needs_a_url()
    {
        using var member = await CreateUserClientAsync();

        var response = await member.PutAsJsonAsync(
            DiscordUrl,
            new { webhookUrl = (string?)null, isEnabled = true, types = BillDueOnly },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, ErrorCodes.DiscordInvalidWebhook);
    }

    [Fact]
    public async Task Only_administrators_switch_discord_for_the_installation()
    {
        using var member = await CreateUserClientAsync();

        var response = await member.PutAsJsonAsync("/api/settings/discord", new { enabled = true }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var publicSettings = await CreateClient().GetStringAsync("/api/settings/public", TestContext.Current.CancellationToken);
        Assert.Contains("\"discordEnabled\":false", publicSettings, StringComparison.Ordinal);
    }

    private async Task<DiscordMember> MemberWithWebhookAsync(string[] types, bool isEnabled = true)
    {
        var user = await CreateUserAsync();
        var client = await LoginAsync(user);
        var id = NewWebhookId();
        var token = $"token-{Guid.NewGuid():N}";
        await SaveWebhookAsync(client, WebhookUrl(id, token), types, isEnabled);
        return new DiscordMember(user, client, id, token);
    }

    private static async Task SaveWebhookAsync(HttpClient client, string? url, string[] types, bool isEnabled = true)
    {
        var response = await client.PutAsJsonAsync(
            DiscordUrl,
            new { webhookUrl = url, isEnabled, types },
            TestContext.Current.CancellationToken);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    private async Task SetDiscordAsync(bool enabled) =>
        (await Client.PutAsJsonAsync("/api/settings/discord", new { enabled }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

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

    private static string WebhookUrl(string id, string? token = null) =>
        $"https://discord.com/api/webhooks/{id}/{token ?? $"token-{Guid.NewGuid():N}"}";

    private sealed record DiscordMember(TestUser User, HttpClient Client, string WebhookId, string Token);

    private sealed record DiscordDto(
        bool HasWebhook,
        bool IsEnabled,
        List<string> Types,
        DateTimeOffset? LastDeliveredAt,
        string? LastError,
        bool DisabledByDiscord,
        bool Unreadable);
}
