using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Email;

[Collection<IntegrationCollection>]
public sealed class EmailVerificationTests(ApiFixture fixture) : EmailTestBase(fixture)
{
    [Fact]
    public async Task A_new_user_starts_unconfirmed_and_the_link_confirms_the_address()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var member = await LoginAsync(user);
            using var anonymous = CreateClient();

            Assert.False((await MeAsync(member)).EmailConfirmed);
            await DrainAsync();
            var token = TokenFrom(Assert.Single(Transport.To(user.Email)).Email.Body, "verify-email");

            var confirmed = await VerifyAsync(anonymous, user.Email, token);
            var again = await VerifyAsync(anonymous, user.Email, token);

            Assert.Equal(HttpStatusCode.NoContent, confirmed.StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
            Assert.True((await MeAsync(member)).EmailConfirmed);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task A_tampered_link_is_refused()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var anonymous = CreateClient();
            await DrainAsync();
            var token = TokenFrom(Assert.Single(Transport.To(user.Email)).Email.Body, "verify-email");

            var response = await VerifyAsync(anonymous, user.Email, token[..^2] + "zz");

            await AssertProblemAsync(response, HttpStatusCode.BadRequest, "email.tokenInvalid");
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task An_unconfirmed_address_blocks_nothing_but_mail()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var member = await LoginAsync(user);

            var account = await CreateAccountAsync(client: member);
            var transactions = await member.GetAsync("/api/transactions");
            var profile = await MeAsync(member);

            Assert.False(profile.EmailConfirmed);
            Assert.True(profile.IsActive);
            Assert.NotEqual(Guid.Empty, account);
            Assert.Equal(HttpStatusCode.OK, transactions.StatusCode);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task Resending_queues_another_link_and_a_confirmed_address_says_so()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var member = await LoginAsync(user);
            using var anonymous = CreateClient();
            await DrainAsync();
            Transport.Reset();

            var resent = await member.PostAsync("/api/auth/send-verification-email", null);
            await DrainAsync();
            var token = TokenFrom(Assert.Single(Transport.To(user.Email)).Email.Body, "verify-email");
            (await VerifyAsync(anonymous, user.Email, token)).EnsureSuccessStatusCode();
            var pointless = await member.PostAsync("/api/auth/send-verification-email", null);

            Assert.Equal(HttpStatusCode.NoContent, resent.StatusCode);
            await AssertProblemAsync(pointless, HttpStatusCode.BadRequest, "email.alreadyVerified");
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task Resending_without_a_mail_server_says_so()
    {
        await DisableEmailAsync();
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);

        var response = await member.PostAsync("/api/auth/send-verification-email", null);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "email.notConfigured");
    }

    private static Task<HttpResponseMessage> VerifyAsync(HttpClient client, string email, string token) =>
        client.PostAsJsonAsync("/api/auth/verify-email", new { email, token });

    private static async Task<ProfileDto> MeAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<ProfileDto>("/api/auth/me"))!;

    private sealed record ProfileDto(Guid Id, string Email, bool IsActive, bool EmailConfirmed, bool BillReminderEmails);
}
