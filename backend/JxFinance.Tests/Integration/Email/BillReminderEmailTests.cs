using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Email;

[Collection<IntegrationCollection>]
public sealed class BillReminderEmailTests(ApiFixture fixture) : EmailTestBase(fixture)
{
    [Fact]
    public async Task No_email_is_sent_while_the_preference_is_off()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var member = await LoginAsync(user);
            await ConfirmAddressAsync(user.Email);
            await CreateDueBillAsync(member);

            await ScanBillsAsync();
            await DrainAsync();

            Assert.Empty(Transport.To(user.Email));
            Assert.Single(await UnreadAsync(member));
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task One_email_beside_one_notification_when_the_preference_is_on()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var member = await LoginAsync(user);
            await ConfirmAddressAsync(user.Email);
            await SubscribeAsync(member);
            await CreateDueBillAsync(member, "Rent");

            await ScanBillsAsync();
            await ScanBillsAsync();
            await DrainAsync();

            var mail = Assert.Single(Transport.To(user.Email));
            Assert.Single(await UnreadAsync(member));
            Assert.Contains("Rent", mail.Email.Subject, StringComparison.Ordinal);
            Assert.Contains("due to be paid", mail.Email.Body, StringComparison.Ordinal);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task An_income_entry_reads_differently_from_an_expense()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var member = await LoginAsync(user);
            await ConfirmAddressAsync(user.Email);
            await SubscribeAsync(member);
            var account = await CreateAccountAsync(client: member);
            await PostAsync<IdDto>(
                member,
                "/api/recurring-bills",
                new
                {
                    name = "Salary",
                    shape = "income",
                    kind = "fixed",
                    amount = "1200.00",
                    accountId = account,
                    cadence = "monthly",
                    nextDueDate = Today,
                    remindDaysBefore = 0,
                });

            await ScanBillsAsync();
            await DrainAsync();

            var mail = Assert.Single(Transport.To(user.Email));
            Assert.Contains("due to arrive", mail.Email.Body, StringComparison.Ordinal);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task A_mail_server_that_throws_leaves_the_scan_and_the_notification_alone()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var member = await LoginAsync(user);
            await ConfirmAddressAsync(user.Email);
            await SubscribeAsync(member);
            await CreateDueBillAsync(member);
            Transport.ThrowOnSend = new IOException("the relay hung up");

            await ScanBillsAsync();
            await DrainAsync();
            await ScanBillsAsync();
            await DrainAsync();

            Assert.Single(await UnreadAsync(member));
            Assert.Empty(Transport.To(user.Email));
        }
        finally
        {
            Transport.ThrowOnSend = null;
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task An_unconfirmed_address_gets_no_reminder_even_with_the_preference_on()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var member = await LoginAsync(user);
            await SubscribeAsync(member);
            await CreateDueBillAsync(member);
            await DrainAsync();
            Transport.Reset();

            await ScanBillsAsync();
            await DrainAsync();

            Assert.Single(await UnreadAsync(member));
            Assert.Empty(Transport.To(user.Email));
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    private async Task ConfirmAddressAsync(string email)
    {
        await DrainAsync();
        var token = TokenFrom(Assert.Single(Transport.To(email)).Email.Body, "verify-email");
        using var anonymous = CreateClient();
        (await anonymous.PostAsJsonAsync("/api/auth/verify-email", new { email, token })).EnsureSuccessStatusCode();
        Transport.Reset();
    }

    private static async Task SubscribeAsync(HttpClient member)
    {
        var response = await member.PutAsJsonAsync(
            "/api/users/me",
            new { displayName = "Test User", currentPassword = (string?)null, newPassword = (string?)null, billReminderEmails = true });
        response.EnsureSuccessStatusCode();
    }

    private async Task<Guid> CreateDueBillAsync(HttpClient client, string? name = null) =>
        (await PostAsync<IdDto>(
            client,
            "/api/recurring-bills",
            new
            {
                name = name ?? $"Due {Guid.NewGuid():N}",
                kind = "fixed",
                amount = "5.00",
                cadence = "monthly",
                nextDueDate = Today,
                remindDaysBefore = 0,
            })).Id;

    private static async Task<List<NotificationDto>> UnreadAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unread=true"))!;

    private sealed record NotificationDto(Guid Id, Guid? RelatedId, bool IsRead);
}
