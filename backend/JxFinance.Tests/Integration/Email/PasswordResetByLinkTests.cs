using System.Net;
using System.Net.Http.Json;
using JxFinance.Infrastructure.Auth;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Email;

[Collection<IntegrationCollection>]
public sealed class PasswordResetByLinkTests(ApiFixture fixture) : EmailTestBase(fixture)
{
    private const string NewPassword = "Another-Test-Password-456!";

    [Fact]
    public async Task A_link_sets_a_new_password_once_and_is_refused_the_second_time()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var anonymous = CreateClient();

            Assert.Equal(HttpStatusCode.NoContent, (await AskAsync(anonymous, user.Email)).StatusCode);
            await DrainAsync();
            var token = TokenFrom(ResetMessageFor(user.Email), "reset-password");

            var first = await ResetAsync(anonymous, user.Email, token, NewPassword);
            var second = await ResetAsync(anonymous, user.Email, token, "Third-Test-Password-789!");

            Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
            await AssertProblemAsync(second, HttpStatusCode.BadRequest, "passwordReset.tokenInvalid");

            using var signedIn = CreateClient();
            Assert.Equal(
                HttpStatusCode.OK,
                (await TryLoginAsync(signedIn, user.Email, NewPassword)).StatusCode);
            using var withOldPassword = CreateClient();
            Assert.Equal(
                HttpStatusCode.Unauthorized,
                (await TryLoginAsync(withOldPassword, user.Email, user.Password)).StatusCode);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task A_reset_by_link_deletes_the_personal_api_tokens()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            var issued = PersonalApiTokenFormat.Issue();
            await WithDbAsync(async db =>
            {
                db.PersonalApiTokens.Add(new PersonalApiToken
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    Name = "Script",
                    Prefix = issued.Prefix,
                    SecretHash = issued.SecretHash,
                    CreatedAt = DateTimeOffset.UtcNow,
                    ExpiresAt = DateTimeOffset.UtcNow.AddDays(30),
                });
                await db.SaveChangesAsync(TestContext.Current.CancellationToken);
            });
            using var anonymous = CreateClient();
            await AskAsync(anonymous, user.Email);
            await DrainAsync();
            var token = TokenFrom(ResetMessageFor(user.Email), "reset-password");

            var reset = await ResetAsync(anonymous, user.Email, token, NewPassword);

            Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);
            Assert.Equal(
                0,
                await WithDbAsync(db => db.PersonalApiTokens.CountAsync(t => t.UserId == user.Id, TestContext.Current.CancellationToken)));
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task An_unknown_address_answers_exactly_like_a_known_one_and_sends_nothing()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var anonymous = CreateClient();
            var unknown = $"nobody-{Guid.NewGuid():N}@localhost";

            var known = await AskAsync(anonymous, user.Email);
            var missing = await AskAsync(anonymous, unknown);
            await DrainAsync();

            Assert.Equal(HttpStatusCode.NoContent, known.StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, missing.StatusCode);
            Assert.Equal(string.Empty, await known.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
            Assert.Equal(string.Empty, await missing.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
            Assert.Empty(Transport.To(unknown));
            Assert.NotEmpty(Transport.To(user.Email));
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task A_deactivated_user_gets_no_link_and_a_stale_link_is_refused()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var anonymous = CreateClient();
            await AskAsync(anonymous, user.Email);
            await DrainAsync();
            var token = TokenFrom(ResetMessageFor(user.Email), "reset-password");
            Transport.Reset();

            (await Client.PostAsync($"/api/users/{user.Id}/deactivate", null, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
            var asked = await AskAsync(anonymous, user.Email);
            await DrainAsync();
            var used = await ResetAsync(anonymous, user.Email, token, NewPassword);

            Assert.Equal(HttpStatusCode.NoContent, asked.StatusCode);
            Assert.Empty(Transport.To(user.Email));
            await AssertProblemAsync(used, HttpStatusCode.BadRequest, "passwordReset.tokenInvalid");
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task A_weak_password_is_refused_and_the_link_still_works()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var anonymous = CreateClient();
            await AskAsync(anonymous, user.Email);
            await DrainAsync();
            var token = TokenFrom(ResetMessageFor(user.Email), "reset-password");

            var short_ = await ResetAsync(anonymous, user.Email, token, "short");
            var accepted = await ResetAsync(anonymous, user.Email, token, NewPassword);

            Assert.Equal(HttpStatusCode.BadRequest, short_.StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, accepted.StatusCode);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task Asking_for_a_link_never_locks_the_account_out()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            for (var i = 0; i < 5; i++)
            {
                using var caller = CreateClient();
                (await AskAsync(caller, user.Email)).EnsureSuccessStatusCode();
            }

            using var signedIn = CreateClient();
            var response = await TryLoginAsync(signedIn, user.Email, user.Password);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task The_link_ignores_the_host_the_request_was_sent_to()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var forged = CreateClient();
            forged.DefaultRequestHeaders.Host = "evil.example";

            Assert.Equal(HttpStatusCode.NoContent, (await AskAsync(forged, user.Email)).StatusCode);
            await DrainAsync();

            var body = ResetMessageFor(user.Email);
            Assert.NotEmpty(TokenFrom(body, "reset-password"));
            Assert.DoesNotContain("evil.example", body, StringComparison.Ordinal);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task Without_a_mail_server_the_answer_is_still_the_same()
    {
        await DisableEmailAsync();
        var user = await CreateUserAsync();
        using var anonymous = CreateClient();

        var response = await AskAsync(anonymous, user.Email);
        await DrainAsync();

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(Transport.Sent);
    }

    private string ResetMessageFor(string address)
    {
        var messages = Transport.To(address);
        Assert.NotEmpty(messages);
        return messages[^1].Email.Body;
    }

    private static Task<HttpResponseMessage> AskAsync(HttpClient client, string email) =>
        client.PostAsJsonAsync("/api/auth/forgot-password", new { email });

    private static Task<HttpResponseMessage> ResetAsync(
        HttpClient client,
        string email,
        string token,
        string newPassword) =>
        client.PostAsJsonAsync("/api/auth/reset-password", new { email, token, newPassword });
}
