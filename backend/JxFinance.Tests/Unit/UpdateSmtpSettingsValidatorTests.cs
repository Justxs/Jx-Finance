using JxFinance.Common.Errors;
using JxFinance.Domain.Email;
using JxFinance.Endpoints.Settings.UpdateSmtpSettings;

namespace JxFinance.Tests.Unit;

public sealed class UpdateSmtpSettingsValidatorTests
{
    [Fact]
    public void A_user_name_without_encryption_is_refused()
    {
        var result = new UpdateSmtpSettingsValidator().Validate(Request(SmtpEncryption.None, "relay"));

        var error = Assert.Single(result.Errors);
        Assert.Equal(nameof(UpdateSmtpSettingsRequest.Encryption), error.PropertyName);
        Assert.Equal(ErrorCodes.EmailInsecureConnection, error.ErrorCode);
    }

    [Theory]
    [InlineData(SmtpEncryption.None, null)]
    [InlineData(SmtpEncryption.StartTls, "relay")]
    [InlineData(SmtpEncryption.SslOnConnect, "relay")]
    public void Encrypted_or_anonymous_servers_are_accepted(SmtpEncryption encryption, string? userName)
    {
        Assert.True(new UpdateSmtpSettingsValidator().Validate(Request(encryption, userName)).IsValid);
    }

    private static UpdateSmtpSettingsRequest Request(SmtpEncryption encryption, string? userName) =>
        new(true, "smtp.example.com", 587, encryption, userName, "relay-secret", "finance@example.com", "Jx Finance");
}
