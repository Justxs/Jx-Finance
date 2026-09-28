using System.Net;
using System.Net.Http.Json;
using JxFinance.Common.Errors;
using JxFinance.Domain.Email;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Email;

[Collection<IntegrationCollection>]
public sealed class NotificationEmailTests(ApiFixture fixture) : EmailTestBase(fixture)
{
    private const string EmailNotificationsUrl = "/api/users/me/email-notifications";

    private static readonly string[] BillAndMonth = ["billDue", "monthReadyToClose"];
    private static readonly string[] BillTwice = ["billDue", "billDue"];
    private static readonly string[] UnknownKind = ["somethingElse"];

    [Fact]
    public async Task A_ticked_budget_alert_is_emailed_once()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var member = await LoginAsync(user);
            await ConfirmAddressAsync(user.Email);
            await ChooseEmailKindsAsync(member, "budgetExceeded");
            await OverspendAsync(member, "Groceries");

            await ScanBudgetsAsync();
            await ScanBudgetsAsync();
            await DrainAsync();

            var mail = Assert.Single(Transport.To(user.Email));
            Assert.Contains("Groceries", mail.Email.Subject, StringComparison.Ordinal);
            Assert.Contains("Weekly limit reached", mail.Email.Body, StringComparison.Ordinal);
            Assert.Contains($"{ApiFixture.SiteUrl}/budgets", mail.Email.Body, StringComparison.Ordinal);
            Assert.Equal(2, (await Seed.UnreadNotificationsAsync(member)).Count);
            Assert.Equal(1, await NotificationEmailCountAsync(user.Email));
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task An_unticked_kind_is_not_emailed()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var member = await LoginAsync(user);
            await ConfirmAddressAsync(user.Email);
            await ChooseEmailKindsAsync(member, "billDue");
            await OverspendAsync(member, "Fuel");

            await ScanBudgetsAsync();
            await DrainAsync();

            Assert.Empty(Transport.To(user.Email));
            Assert.Equal(2, (await Seed.UnreadNotificationsAsync(member)).Count);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task An_unconfirmed_address_is_not_emailed_a_ticked_kind()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var member = await LoginAsync(user);
            await ChooseEmailKindsAsync(member, "budgetWarning", "budgetExceeded");
            await OverspendAsync(member, "Dining");
            await DrainAsync();
            Transport.Reset();

            await ScanBudgetsAsync();
            await DrainAsync();

            Assert.Empty(Transport.To(user.Email));
            Assert.Equal(0, await NotificationEmailCountAsync(user.Email));
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task Nothing_is_queued_while_the_mail_server_is_off()
    {
        await DisableEmailAsync();
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        await WithDbAsync(db => db.Users
            .Where(u => u.Id == user.Id)
            .ExecuteUpdateAsync(u => u.SetProperty(x => x.EmailConfirmed, true), TestContext.Current.CancellationToken));
        await ChooseEmailKindsAsync(member, "budgetExceeded");
        await OverspendAsync(member, "Travel");

        await ScanBudgetsAsync();

        Assert.Equal(2, (await Seed.UnreadNotificationsAsync(member)).Count);
        Assert.Equal(0, await NotificationEmailCountAsync(user.Email));
    }

    [Fact]
    public async Task The_chosen_kinds_are_saved_and_returned_on_the_profile()
    {
        using var member = await CreateUserClientAsync();

        var saved = await member.PutAsJsonAsync(
            EmailNotificationsUrl,
            new { types = BillAndMonth },
            TestContext.Current.CancellationToken);

        saved.EnsureSuccessStatusCode();
        var answer = await saved.Content.ReadFromJsonAsync<ProfileDto>(TestContext.Current.CancellationToken);
        Assert.Equal(BillAndMonth, answer!.EmailNotificationTypes);
        var me = await member.GetFromJsonAsync<ProfileDto>("/api/auth/me", TestContext.Current.CancellationToken);
        Assert.Equal(BillAndMonth, me!.EmailNotificationTypes);

        (await member.PutAsJsonAsync(EmailNotificationsUrl, new { types = Array.Empty<string>() }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        var cleared = await member.GetFromJsonAsync<ProfileDto>("/api/auth/me", TestContext.Current.CancellationToken);
        Assert.Empty(cleared!.EmailNotificationTypes);
    }

    [Fact]
    public async Task A_kind_listed_twice_is_refused()
    {
        using var member = await CreateUserClientAsync();

        var response = await member.PutAsJsonAsync(
            EmailNotificationsUrl,
            new { types = BillTwice },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, ErrorCodes.CollectionInvalidSize);
    }

    [Fact]
    public async Task A_missing_list_is_refused()
    {
        using var member = await CreateUserClientAsync();

        var response = await member.PutAsJsonAsync(EmailNotificationsUrl, new { }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, ErrorCodes.Required);
    }

    [Fact]
    public async Task An_unknown_kind_is_refused()
    {
        using var member = await CreateUserClientAsync();

        var response = await member.PutAsJsonAsync(
            EmailNotificationsUrl,
            new { types = UnknownKind },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task OverspendAsync(HttpClient member, string categoryName)
    {
        var account = await CreateAccountAsync("1000.00", client: member);
        var category = await Seed.CategoryAsync(member, categoryName, "expense");
        await PostAsync<IdDto>(
            member,
            "/api/budgets",
            new { categoryId = category, limitAmount = "100.00", period = "weekly", rolloverEnabled = false });
        await PostAsync<IdDto>(
            member,
            "/api/transactions",
            new { accountId = account, categoryId = category, type = "expense", amount = "120.00", date = Today });
    }

    private Task ScanBudgetsAsync() => Job<BudgetAlertJob>().RunOnceAsync(TestContext.Current.CancellationToken);

    private Task<int> NotificationEmailCountAsync(string address) =>
        WithDbAsync(db => db.EmailMessages
            .Where(m => m.ToAddress == address && m.Kind == EmailKind.Notification)
            .CountAsync(TestContext.Current.CancellationToken));

    private sealed record ProfileDto(Guid Id, List<string> EmailNotificationTypes);
}
