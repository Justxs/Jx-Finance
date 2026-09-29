using System.Net.Http.Json;
using JxFinance.Domain.Email;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Email;

[Collection<IntegrationCollection>]
public sealed class EmailOutboxTests(ApiFixture fixture) : EmailTestBase(fixture)
{
    [Fact]
    public async Task A_failure_with_a_long_message_is_recorded_cut_to_the_column()
    {
        try
        {
            await EnableEmailAsync();
            var user = await CreateUserAsync();
            using var anonymous = CreateClient();
            (await anonymous.PostAsJsonAsync("/api/auth/forgot-password", new { email = user.Email }, TestContext.Current.CancellationToken))
                .EnsureSuccessStatusCode();
            Transport.ThrowOnSend = new IOException(new string('x', EmailMessage.ErrorMaxLength + 100));

            await DrainAsync();

            var message = await WithDbAsync(db => db.EmailMessages
                .AsNoTracking()
                .SingleAsync(m => m.ToAddress == user.Email && m.Kind == EmailKind.PasswordReset, TestContext.Current.CancellationToken));
            Assert.Equal(1, message.Attempts);
            Assert.Null(message.SentAt);
            Assert.Equal(EmailMessage.ErrorMaxLength, message.LastError!.Length);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }
}
