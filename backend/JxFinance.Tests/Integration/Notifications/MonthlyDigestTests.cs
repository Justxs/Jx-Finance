using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Integration.Email;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace JxFinance.Tests.Integration.Notifications;

[Collection<IntegrationCollection>]
public sealed class MonthlyDigestTests(ApiFixture fixture) : EmailTestBase(fixture)
{
    private const string LanguageUrl = "/api/users/me/language";

    private const string DigestScopesUrl = "/api/users/me/digest-scopes";

    private static readonly string[] DigestOnly = ["monthlyDigest"];

    private static readonly DateTimeOffset FirstOfOctober = new(2026, 10, 1, 8, 0, 0, TimeSpan.Zero);

    private FakeDiscordWebhookClient Discord => Services.GetRequiredService<FakeDiscordWebhookClient>();

    [Fact]
    public async Task An_emailed_digest_arrives_once_with_the_figures_of_the_month_review()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var member = await LoginAsync(user);
            await ConfirmAddressAsync(user.Email);
            await ChooseEmailKindsAsync(member, "monthlyDigest");
            await SpendInSeptemberAsync(member, "Groceries", "120.00");
            var review = await member.GetFromJsonAsync<ReviewDto>("/api/month-close/2026-09", TestContext.Current.CancellationToken);

            await RunAsync(FirstOfOctober);
            await RunAsync(FirstOfOctober.AddHours(1));
            await RunAsync(FirstOfOctober.AddDays(1));
            await DrainAsync();

            var digest = Assert.Single(await DigestsAsync(user.Id));
            Assert.StartsWith("September 2026: income", digest.Message, StringComparison.Ordinal);
            Assert.Equal(new DateOnly(2026, 9, 1), digest.Payload!.Month);
            Assert.Equal(
                (review!.Figures.TotalIncome, review.Figures.TotalExpense, review.Figures.Net),
                (digest.Payload.Digest!.Income, digest.Payload.Digest.Expense, digest.Payload.Digest.Net));
            Assert.Equal(review.Checklist.Uncategorized, digest.Payload.Digest.Uncategorized);
            Assert.Single(await Seed.UnreadNotificationsAsync(member));
            var mail = Assert.Single(Transport.To(user.Email)).Email;
            Assert.Contains("your September 2026", mail.Subject, StringComparison.Ordinal);
            Assert.Contains($"expenses {review.Figures.TotalExpense} EUR", mail.Body, StringComparison.Ordinal);
            Assert.Contains($"{ApiFixture.SiteUrl}/?month=2026-09", mail.Body, StringComparison.Ordinal);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task Only_members_who_ticked_the_digest_get_it_and_discord_alone_is_enough()
    {
        await SetDiscordAsync(true);
        try
        {
            var silent = await CreateUserAsync();
            using var silentClient = await LoginAsync(silent);
            await SpendInSeptemberAsync(silentClient, "Fuel", "40.00");
            var listener = await CreateUserAsync();
            using var listenerClient = await LoginAsync(listener);
            await SpendInSeptemberAsync(listenerClient, "Fuel", "40.00");
            var webhookId = Random.Shared.NextInt64(1_000_000_000, long.MaxValue).ToString(CultureInfo.InvariantCulture);
            (await listenerClient.PutAsJsonAsync(
                "/api/users/me/discord",
                new { webhookUrl = $"https://discord.com/api/webhooks/{webhookId}/token-{Guid.NewGuid():N}", isEnabled = true, types = DigestOnly },
                TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

            await RunAsync(FirstOfOctober);
            await Job<DiscordOutboxJob>().RunOnceAsync(TestContext.Current.CancellationToken);

            Assert.Empty(await DigestsAsync(silent.Id));
            Assert.Empty(await Seed.UnreadNotificationsAsync(silentClient));
            Assert.Single(await DigestsAsync(listener.Id));
            var post = Assert.Single(Discord.To(webhookId)).Post;
            Assert.StartsWith("**September 2026**", post.Content, StringComparison.Ordinal);
            Assert.Contains("expenses 40.00 EUR", post.Content, StringComparison.Ordinal);
        }
        finally
        {
            await SetDiscordAsync(false);
        }
    }

    [Fact]
    public async Task The_digest_reads_as_the_member_across_everything_they_can_see()
    {
        using var pair = await CreateHouseholdPairAsync();
        var sibling = await CreateUserAsync();
        using var siblingClient = await LoginAsync(sibling);
        var otherHousehold = await CreateHouseholdAsync(pair.Owner, sibling);
        using var stranger = await CreateUserClientAsync();
        await ChooseEmailKindsAsync(pair.OwnerClient, "monthlyDigest");
        await SpendInSeptemberAsync(pair.OwnerClient, "Rent", "300.00");
        await SpendInSeptemberAsync(pair.PartnerClient, "Rent", "50.00", pair.HouseholdId);
        await SpendInSeptemberAsync(siblingClient, "Rent", "70.00", otherHousehold);
        await SpendInSeptemberAsync(stranger, "Rent", "999.00");
        var everything = await pair.OwnerClient.GetFromJsonAsync<ReviewDto>("/api/month-close/2026-09", TestContext.Current.CancellationToken);
        var household = await GetScopedAsync<ReviewDto>(pair.OwnerClient, "/api/month-close/2026-09", pair.HouseholdId);

        await RunAsync(FirstOfOctober);

        var digest = Assert.Single(await DigestsAsync(pair.Owner.Id)).Payload!.Digest!;
        Assert.Equal("420.00", everything!.Figures.TotalExpense);
        Assert.Equal("350.00", household.Figures.TotalExpense);
        Assert.Equal(everything.Figures.TotalExpense, digest.Expense);
    }

    [Fact]
    public async Task A_household_digest_carries_that_households_figures_and_name_beside_everything_once_each()
    {
        using var pair = await CreateHouseholdPairAsync();
        await ChooseEmailKindsAsync(pair.OwnerClient, "monthlyDigest");
        await SpendInSeptemberAsync(pair.OwnerClient, "Rent", "300.00");
        await SpendInSeptemberAsync(pair.PartnerClient, "Rent", "50.00", pair.HouseholdId);
        var sibling = await CreateUserAsync();
        using var siblingClient = await LoginAsync(sibling);
        await SpendInSeptemberAsync(siblingClient, "Rent", "70.00", await CreateHouseholdAsync(pair.Owner, sibling));
        await ScopesAsync(pair.OwnerClient, true, pair.HouseholdId);
        var everything = await pair.OwnerClient.GetFromJsonAsync<ReviewDto>("/api/month-close/2026-09", TestContext.Current.CancellationToken);
        var household = await GetScopedAsync<ReviewDto>(pair.OwnerClient, "/api/month-close/2026-09", pair.HouseholdId);
        var name = await HouseholdNameAsync(pair.OwnerClient, pair.HouseholdId);

        await RunAsync(FirstOfOctober);
        await RunAsync(FirstOfOctober.AddHours(1));

        var digests = await DigestsAsync(pair.Owner.Id);
        Assert.Equal(2, digests.Count);
        var whole = Assert.Single(digests, d => d.RelatedId is null);
        var shared = Assert.Single(digests, d => d.RelatedId == pair.HouseholdId);
        Assert.Equal((everything!.Figures.TotalExpense, (string?)null), (whole.Payload!.Digest!.Expense, whole.Payload.Household));
        Assert.Equal((household.Figures.TotalExpense, name, "Household"), (shared.Payload!.Digest!.Expense, shared.Payload.Household, shared.RelatedType));
        Assert.Equal($"September 2026, {name}", shared.Title);
        Assert.NotEqual(whole.Payload.Digest.Expense, shared.Payload.Digest.Expense);
    }

    [Fact]
    public async Task Everything_switched_off_leaves_only_the_household_digest()
    {
        using var pair = await CreateHouseholdPairAsync();
        await ChooseEmailKindsAsync(pair.PartnerClient, "monthlyDigest");
        await SpendInSeptemberAsync(pair.PartnerClient, "Rent", "50.00", pair.HouseholdId);
        await ScopesAsync(pair.PartnerClient, false, pair.HouseholdId);

        await RunAsync(FirstOfOctober);

        Assert.Equal(pair.HouseholdId, Assert.Single(await DigestsAsync(pair.Partner.Id)).RelatedId);
    }

    [Fact]
    public async Task A_household_the_member_left_or_a_switched_off_households_feature_sends_no_household_digest()
    {
        using var pair = await CreateHouseholdPairAsync();
        await ChooseEmailKindsAsync(pair.PartnerClient, "monthlyDigest");
        await ChooseEmailKindsAsync(pair.OwnerClient, "monthlyDigest");
        await SpendInSeptemberAsync(pair.PartnerClient, "Rent", "50.00");
        await SpendInSeptemberAsync(pair.OwnerClient, "Rent", "60.00", pair.HouseholdId);
        await ScopesAsync(pair.PartnerClient, true, pair.HouseholdId);
        await ScopesAsync(pair.OwnerClient, true, pair.HouseholdId);
        (await Client.DeleteAsync($"/api/households/{pair.HouseholdId}/members/{pair.Partner.Id}", TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

        await using (await FeatureOffAsync("households"))
        {
            await RunAsync(FirstOfOctober);
        }

        await RunAsync(FirstOfOctober.AddHours(1));

        Assert.Null(Assert.Single(await DigestsAsync(pair.Partner.Id)).RelatedId);
        var ownerDigests = await DigestsAsync(pair.Owner.Id);
        Assert.Equal(2, ownerDigests.Count);
        Assert.True(ownerDigests.Single(d => d.RelatedId is null).CreatedAt < ownerDigests.Single(d => d.RelatedId == pair.HouseholdId).CreatedAt);
    }

    [Fact]
    public async Task The_scopes_start_on_everything_and_refuse_a_missing_list_a_repeat_or_a_household_of_others()
    {
        using var pair = await CreateHouseholdPairAsync();
        var foreign = await CreateHouseholdAsync();

        var profile = await pair.PartnerClient.GetFromJsonAsync<DigestProfileDto>("/api/auth/me", TestContext.Current.CancellationToken);
        Assert.Equal((true, 0), (profile!.MonthlyDigestEverything, profile.MonthlyDigestHouseholdIds.Count));

        await AssertValidationErrorAsync(
            await pair.PartnerClient.PutAsJsonAsync(DigestScopesUrl, new { everything = true }, TestContext.Current.CancellationToken),
            "householdIds");
        await AssertProblemAsync(
            await pair.PartnerClient.PutAsJsonAsync(DigestScopesUrl, new { everything = true, householdIds = new[] { pair.HouseholdId, pair.HouseholdId } }, TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            ErrorCodes.CollectionInvalidSize);
        await AssertProblemAsync(
            await pair.PartnerClient.PutAsJsonAsync(DigestScopesUrl, new { everything = true, householdIds = new[] { foreign } }, TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            ErrorCodes.HouseholdNotMember);

        var saved = await ScopesAsync(pair.PartnerClient, false, pair.HouseholdId);
        Assert.False(saved.MonthlyDigestEverything);
        Assert.Equal([pair.HouseholdId], saved.MonthlyDigestHouseholdIds);
    }

    [Fact]
    public async Task Nothing_is_sent_after_the_fifth_or_while_month_close_is_off_or_for_an_empty_month()
    {
        using var busy = await CreateUserClientAsync();
        var busyUser = await MeAsync(busy);
        await ChooseEmailKindsAsync(busy, "monthlyDigest");
        await SpendInSeptemberAsync(busy, "Books", "15.00");
        using var idle = await CreateUserClientAsync();
        var idleUser = await MeAsync(idle);
        await ChooseEmailKindsAsync(idle, "monthlyDigest");

        await RunAsync(new DateTimeOffset(2026, 10, 6, 8, 0, 0, TimeSpan.Zero));
        await using (await FeatureOffAsync("monthClose"))
        {
            await RunAsync(FirstOfOctober);
        }

        Assert.Empty(await DigestsAsync(busyUser));

        await RunAsync(FirstOfOctober);

        Assert.Single(await DigestsAsync(busyUser));
        Assert.Empty(await DigestsAsync(idleUser));
    }

    [Fact]
    public async Task Mail_follows_the_members_language_and_falls_back_to_the_installations()
    {
        try
        {
            await EnableEmailAsync();
            var lithuanian = await CreateUserAsync();
            using var lithuanianClient = await LoginAsync(lithuanian);
            await ConfirmAddressAsync(lithuanian.Email);
            await ChooseEmailKindsAsync(lithuanianClient, "monthlyDigest");
            var saved = await lithuanianClient.PutAsJsonAsync(LanguageUrl, new { language = "lt" }, TestContext.Current.CancellationToken);
            Assert.Equal("lt", (await ReadOkAsync<ProfileDto>(saved)).Language);
            await SpendInSeptemberAsync(lithuanianClient, "Maistas", "12.00");

            await RunAsync(FirstOfOctober);
            await DrainAsync();

            var mail = Assert.Single(Transport.To(lithuanian.Email)).Email;
            Assert.Contains("mėnesio suvestinė, 2026 m. rugsėjis", mail.Subject, StringComparison.Ordinal);
            Assert.StartsWith("Sveiki,", mail.Body, StringComparison.Ordinal);

            await using (await OverrideSettingsAsync(settings => settings["defaultLanguage"] = "lt"))
            {
                var unset = await CreateUserAsync();
                using var unsetClient = await LoginAsync(unset);
                await ConfirmAddressAsync(unset.Email);
                await ChooseEmailKindsAsync(unsetClient, "monthlyDigest");
                await SpendInSeptemberAsync(unsetClient, "Maistas", "12.00");
                Assert.Null((await unsetClient.GetFromJsonAsync<ProfileDto>("/api/auth/me", TestContext.Current.CancellationToken))!.Language);

                await RunAsync(FirstOfOctober);
                await DrainAsync();

                Assert.StartsWith("Sveiki,", Assert.Single(Transport.To(unset.Email)).Email.Body, StringComparison.Ordinal);
            }
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task An_unknown_language_is_refused()
    {
        using var member = await CreateUserClientAsync();

        var response = await member.PutAsJsonAsync(LanguageUrl, new { language = "de" }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, ErrorCodes.EnumInvalid);
    }

    [Fact]
    public async Task A_job_user_scope_resolves_the_member_and_every_other_scope_the_request_user()
    {
        var userId = Guid.NewGuid();
        var probe = Job<ProbeJob>(userId);

        await probe.RunOnceAsync(TestContext.Current.CancellationToken);

        Assert.Equal(new FixedUser(userId), probe.Inside);
        Assert.IsType<HttpCurrentUser>(probe.Outside);
    }

    private Task RunAsync(DateTimeOffset now) =>
        Job<MonthlyDigestJob>(new TestClock(now)).RunOnceAsync(TestContext.Current.CancellationToken);

    private async Task SpendInSeptemberAsync(HttpClient client, string category, string amount, Guid? householdId = null)
    {
        var account = await CreateAccountAsync("1000.00", householdId: householdId, client: client);
        var categoryId = await Seed.CategoryAsync(client, $"{category} {Guid.NewGuid():N}", "expense");
        await CreateTransactionAsync(client, account, categoryId, "expense", amount, "2026-09-10");
    }

    private Task<List<Notification>> DigestsAsync(Guid userId) =>
        WithDbAsync(db => db.Notifications
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(n => n.UserId == userId && n.Type == NotificationType.MonthlyDigest)
            .ToListAsync(TestContext.Current.CancellationToken));

    private static async Task<DigestProfileDto> ScopesAsync(HttpClient client, bool everything, params Guid[] householdIds) =>
        await ReadOkAsync<DigestProfileDto>(await client.PutAsJsonAsync(DigestScopesUrl, new { everything, householdIds }, TestContext.Current.CancellationToken));

    private static async Task<string> HouseholdNameAsync(HttpClient client, Guid householdId) =>
        (await client.GetFromJsonAsync<List<NamedRow>>("/api/households", TestContext.Current.CancellationToken))!.Single(h => h.Id == householdId).Name;

    private static async Task<Guid> MeAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<ProfileDto>("/api/auth/me", TestContext.Current.CancellationToken))!.Id;

    private async Task SetDiscordAsync(bool enabled) =>
        (await Client.PutAsJsonAsync("/api/settings/discord", new { enabled }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

    private sealed class ProbeJob(IServiceScopeFactory scopes, ILogger<ProbeJob> logger, Guid userId) : PeriodicJob(scopes, logger)
    {
        public ICurrentUser? Inside { get; private set; }

        public ICurrentUser? Outside { get; private set; }

        protected override string Name => "Probe";

        protected override JobSchedule Schedule => JobSchedule.Every(TimeSpan.FromHours(1));

        protected override Task RunAsync(IServiceProvider services, CancellationToken ct)
        {
            Outside = services.GetRequiredService<ICurrentUser>();
            return RunAsUserAsync(userId, scoped =>
            {
                Inside = scoped.GetRequiredService<ICurrentUser>();
                return Task.CompletedTask;
            });
        }
    }

    private sealed record ProfileDto(Guid Id, string? Language);

    private sealed record DigestProfileDto(bool MonthlyDigestEverything, List<Guid> MonthlyDigestHouseholdIds);

    private sealed record FiguresDto(string TotalIncome, string TotalExpense, string Net);

    private sealed record ChecklistDto(int Uncategorized);

    private sealed record ReviewDto(ChecklistDto Checklist, FiguresDto Figures);
}
