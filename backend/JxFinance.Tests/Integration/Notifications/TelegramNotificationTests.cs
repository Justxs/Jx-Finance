using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using JxFinance.Common.Errors;
using JxFinance.Common.Telegram;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Notifications;

[Collection<NotificationsCollection>]
public sealed class TelegramNotificationTests(NotificationsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string SettingsUrl = "/api/settings/telegram";
    private const string TestUrl = SettingsUrl + "/test";
    private const string KindsUrl = "/api/users/me/telegram-notifications";

    private static readonly string[] BillAndBudget = ["billDue", "budgetWarning"];
    private static readonly string[] BillTwice = ["billDue", "billDue"];

    private FakeTelegramBotClient Telegram => Services.GetRequiredService<FakeTelegramBotClient>();

    [Fact]
    public async Task Only_administrators_read_save_and_test_the_group()
    {
        using var member = await CreateUserClientAsync();

        var read = await member.GetAsync(SettingsUrl, TestContext.Current.CancellationToken);
        var saved = await member.PutAsJsonAsync(SettingsUrl, new { enabled = true }, TestContext.Current.CancellationToken);
        var tested = await member.PostAsync(TestUrl, null, TestContext.Current.CancellationToken);

        Assert.All([read, saved, tested], response => Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode));
    }

    [Fact]
    public async Task The_group_is_saved_kept_and_tested_without_ever_returning_the_token()
    {
        using var admin = await CreateUserClientAsync("Admin");
        var chat = NewChatId();
        var token = NewToken();
        await SaveAsync(admin, false, chat, token);

        await SaveAsync(admin, false, chat, "");
        var tested = await admin.PostAsync(TestUrl, null, TestContext.Current.CancellationToken);
        var body = await admin.GetStringAsync(SettingsUrl, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, tested.StatusCode);
        var message = Assert.Single(Telegram.To(chat));
        Assert.Equal(token, message.Target.Token);
        Assert.Contains("Telegram bot works", message.Html, StringComparison.Ordinal);
        Assert.DoesNotContain(token, body, StringComparison.Ordinal);
        var settings = JsonSerializer.Deserialize<TelegramDto>(body, JsonSerializerOptions.Web)!;
        Assert.Equal((false, true, chat), (settings.Enabled, settings.HasToken, settings.ChatId));
        Assert.NotNull(settings.LastDeliveredAt);
    }

    [Fact]
    public async Task Without_a_token_and_a_group_the_test_is_not_found_and_telegram_cannot_be_switched_on()
    {
        using var admin = await CreateUserClientAsync("Admin");
        await WithDbAsync(db => db.InstanceSettings.ExecuteUpdateAsync(
            s => s.SetProperty(x => x.TelegramEnabled, false)
                .SetProperty(x => x.TelegramProtectedToken, string.Empty)
                .SetProperty(x => x.TelegramChatId, (long?)null),
            TestContext.Current.CancellationToken));

        var tested = await admin.PostAsync(TestUrl, null, TestContext.Current.CancellationToken);
        var withoutToken = await admin.PutAsJsonAsync(
            SettingsUrl,
            new { enabled = true, chatId = NewChatId() },
            TestContext.Current.CancellationToken);
        var malformed = await admin.PutAsJsonAsync(
            SettingsUrl,
            new { enabled = false, botToken = "123:short/../../internal" },
            TestContext.Current.CancellationToken);
        var withoutChat = await admin.PutAsJsonAsync(
            SettingsUrl,
            new { enabled = true, botToken = NewToken() },
            TestContext.Current.CancellationToken);
        var zeroChat = await admin.PutAsJsonAsync(
            SettingsUrl,
            new { enabled = false, chatId = 0 },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(tested, HttpStatusCode.NotFound, ErrorCodes.ResourceNotFound);
        await AssertProblemAsync(withoutToken, HttpStatusCode.BadRequest, ErrorCodes.TelegramInvalidToken);
        await AssertProblemAsync(malformed, HttpStatusCode.BadRequest, ErrorCodes.TelegramInvalidToken);
        await AssertProblemAsync(withoutChat, HttpStatusCode.BadRequest, ErrorCodes.TelegramInvalidChat);
        await AssertProblemAsync(zeroChat, HttpStatusCode.BadRequest, ErrorCodes.TelegramInvalidChat);
        Assert.False((await admin.GetFromJsonAsync<TelegramDto>(SettingsUrl, TestContext.Current.CancellationToken))!.HasToken);
    }

    [Fact]
    public async Task Members_choose_on_their_profile_which_kinds_go_to_telegram()
    {
        using var member = await CreateUserClientAsync();

        var saved = await ReadOkAsync<ProfileDto>(await member.PutAsJsonAsync(
            KindsUrl,
            new { types = BillAndBudget },
            TestContext.Current.CancellationToken));
        var twice = await member.PutAsJsonAsync(KindsUrl, new { types = BillTwice }, TestContext.Current.CancellationToken);

        Assert.Equal(BillAndBudget, saved.TelegramNotificationTypes);
        await AssertProblemAsync(twice, HttpStatusCode.BadRequest, ErrorCodes.CollectionInvalidSize);
        var me = await member.GetFromJsonAsync<ProfileDto>("/api/auth/me", TestContext.Current.CancellationToken);
        Assert.Equal(BillAndBudget, me!.TelegramNotificationTypes);
    }

    [Fact]
    public async Task A_bill_reminder_reaches_the_group_only_when_the_switch_is_on_and_the_kind_is_ticked()
    {
        using var admin = await CreateUserClientAsync("Admin");
        var chat = NewChatId();
        await SaveAsync(admin, false, chat, NewToken());
        var switchedOff = await MemberAsync("billDue");
        var otherKind = await MemberAsync("budgetExceeded");
        var first = await MemberAsync("billDue");
        var second = await MemberAsync("billDue");
        await Seed.RecurringBillAsync(switchedOff.Client, Today, "Water");
        await ScanBillsAsync();
        await SaveAsync(admin, true, chat);
        try
        {
            await Seed.RecurringBillAsync(otherKind.Client, Today, "Water");
            await Seed.RecurringBillAsync(first.Client, Today, "Rent <b>now</b> & @everyone");
            await Seed.RecurringBillAsync(second.Client, Today, "Gym");
            await ScanBillsAsync();
            await DrainAsync();

            Assert.Equal(0, await MessageCountAsync(switchedOff.User.Id));
            Assert.Equal(0, await MessageCountAsync(otherKind.User.Id));
            var posts = Telegram.To(chat).Select(m => m.Html).ToList();
            Assert.Equal(2, posts.Count);
            var rent = Assert.Single(posts, p => p.StartsWith(
                "Test User · <b>Rent &lt;b&gt;now&lt;/b&gt; &amp; @⁠everyone</b>",
                StringComparison.Ordinal));
            Assert.Contains("Payment due", rent, StringComparison.Ordinal);
            Assert.EndsWith($"\n{ApiFixture.SiteUrl}/recurring-bills", rent, StringComparison.Ordinal);
            Assert.Contains(posts, p => p.Contains("<b>Gym</b>", StringComparison.Ordinal));
            Assert.Single(await Seed.UnreadNotificationsAsync(first.Client));
        }
        finally
        {
            await SwitchOffAsync(admin);
        }
    }

    [Fact]
    public async Task Running_the_job_twice_queues_one_message() =>
        await WithGroupAsync(async (_, chat) =>
        {
            var member = await MemberAsync("billDue");
            await Seed.RecurringBillAsync(member.Client, Today, "Internet");
            await ScanBillsAsync();
            await ScanBillsAsync();
            await DrainAsync();
            await DrainAsync();

            Assert.Single(Telegram.To(chat));
            Assert.Equal(1, await MessageCountAsync(member.User.Id));
        });

    [Fact]
    public async Task Rate_limiting_reschedules_without_counting_an_attempt() =>
        await WithGroupAsync(async (_, chat) =>
        {
            var member = await MemberAsync("billDue");
            await Seed.RecurringBillAsync(member.Client, Today, "Gym");
            await ScanBillsAsync();
            Telegram.AnswerNext(
                chat,
                TelegramSendResult.Failure(ErrorCodes.TelegramRateLimited, "slow down", TimeSpan.FromMinutes(2)));
            var before = DateTimeOffset.UtcNow;

            await DrainAsync();

            Assert.Empty(Telegram.To(chat));
            var message = await SingleMessageAsync(member.User.Id);
            Assert.Equal(0, message.Attempts);
            Assert.Null(message.SentAt);
            Assert.True(message.NextAttemptAt >= before.AddSeconds(100));
        });

    [Fact]
    public async Task A_removed_bot_gives_up_the_queue_until_a_new_token_is_saved() =>
        await WithGroupAsync(async (admin, chat) =>
        {
            var member = await MemberAsync("billDue");
            await Seed.RecurringBillAsync(member.Client, Today, "Rent");
            await Seed.RecurringBillAsync(member.Client, Today, "Water");
            await ScanBillsAsync();
            Telegram.AnswerNext(
                chat,
                TelegramSendResult.Failure(ErrorCodes.TelegramBotRemoved, "Telegram says the bot was removed from the group."));

            await DrainAsync();
            await DrainAsync();

            Assert.Empty(Telegram.To(chat));
            var messages = await MessagesAsync(member.User.Id);
            Assert.Equal(2, messages.Count);
            Assert.All(messages, m => Assert.True(m.IsGivenUp));
            var settings = await admin.GetFromJsonAsync<TelegramDto>(SettingsUrl, TestContext.Current.CancellationToken);
            Assert.True(settings!.DisabledByTelegram);
            Assert.Contains("removed from the group", settings.LastError, StringComparison.Ordinal);
            var renewed = await SaveAsync(admin, true, chat, NewToken());
            Assert.Equal((false, null), (renewed.DisabledByTelegram, renewed.LastError));
        });

    [Fact]
    public async Task A_group_that_became_a_supergroup_is_followed_to_its_new_id() =>
        await WithGroupAsync(async (admin, chat) =>
        {
            var member = await MemberAsync("billDue");
            await Seed.RecurringBillAsync(member.Client, Today, "Phone");
            await ScanBillsAsync();
            var supergroup = NewChatId();
            Telegram.AnswerNext(
                chat,
                new TelegramSendResult(
                    new DomainError(ErrorCodes.TelegramRejected, "The Telegram group moved to a new chat id."),
                    MigrateToChatId: supergroup));

            await DrainAsync();

            Assert.Single(Telegram.To(supergroup));
            Assert.NotNull((await SingleMessageAsync(member.User.Id)).SentAt);
            var settings = await admin.GetFromJsonAsync<TelegramDto>(SettingsUrl, TestContext.Current.CancellationToken);
            Assert.Equal((supergroup, null), (settings!.ChatId, settings.LastError));
        });

    private async Task WithGroupAsync(Func<HttpClient, long, Task> test)
    {
        using var admin = await CreateUserClientAsync("Admin");
        var chat = NewChatId();
        await SaveAsync(admin, true, chat, NewToken());
        try
        {
            await test(admin, chat);
        }
        finally
        {
            await SwitchOffAsync(admin);
        }
    }

    private static async Task<TelegramDto> SaveAsync(HttpClient admin, bool enabled, long? chatId, string? botToken = null) =>
        await ReadOkAsync<TelegramDto>(await admin.PutAsJsonAsync(
            SettingsUrl,
            new { enabled, botToken, chatId },
            TestContext.Current.CancellationToken));

    private async Task SwitchOffAsync(HttpClient admin)
    {
        await SaveAsync(admin, false, null);
        await WithDbAsync(db => db.TelegramMessages.ExecuteDeleteAsync(TestContext.Current.CancellationToken));
    }

    private async Task<Member> MemberAsync(params string[] types)
    {
        var user = await CreateUserAsync();
        var client = await LoginAsync(user);
        (await client.PutAsJsonAsync(KindsUrl, new { types }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        return new Member(user, client);
    }

    private Task ScanBillsAsync() => Job<RecurringBillReminderJob>().RunOnceAsync(TestContext.Current.CancellationToken);

    private Task DrainAsync() => Job<TelegramOutboxJob>().RunOnceAsync(TestContext.Current.CancellationToken);

    private Task<List<TelegramMessage>> MessagesAsync(Guid userId) =>
        WithDbAsync(db => db.TelegramMessages.AsNoTracking()
            .Where(m => m.UserId == userId)
            .ToListAsync(TestContext.Current.CancellationToken));

    private async Task<TelegramMessage> SingleMessageAsync(Guid userId) => Assert.Single(await MessagesAsync(userId));

    private async Task<int> MessageCountAsync(Guid userId) => (await MessagesAsync(userId)).Count;

    private static long NewChatId() => -Random.Shared.NextInt64(1_000_000_000, 1_000_000_000_000);

    private static string NewToken() => $"{Random.Shared.Next(100_000, int.MaxValue)}:{Guid.NewGuid():N}";

    private sealed record Member(TestUser User, HttpClient Client);

    private sealed record ProfileDto(List<string> TelegramNotificationTypes);

    private sealed record TelegramDto(
        bool Enabled,
        bool HasToken,
        long? ChatId,
        DateTimeOffset? LastDeliveredAt,
        string? LastError,
        bool DisabledByTelegram);
}
