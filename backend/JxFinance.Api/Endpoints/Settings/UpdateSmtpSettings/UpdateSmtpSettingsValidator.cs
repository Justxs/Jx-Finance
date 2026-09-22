using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Email;

namespace JxFinance.Endpoints.Settings.UpdateSmtpSettings;

public sealed class UpdateSmtpSettingsValidator : Validator<UpdateSmtpSettingsRequest>
{
    public UpdateSmtpSettingsValidator()
    {
        RuleFor(r => r.Host).HasMaxLength(255);
        RuleFor(r => r.Host).IsRequired().When(r => r.Enabled);
        RuleFor(r => r.Port).IsWithin(1, 65535);
        RuleFor(r => r.Encryption).IsKnownEnum();
        RuleFor(r => r.Encryption)
            .NotEqual(SmtpEncryption.None)
            .When(r => !string.IsNullOrWhiteSpace(r.UserName))
            .WithErrorCode(ErrorCodes.EmailInsecureConnection)
            .WithMessage("A user name and password are only sent over an encrypted connection. Choose STARTTLS or SSL/TLS.");
        RuleFor(r => r.UserName).HasMaxLength(255);
        RuleFor(r => r.Password).HasMaxLength(255);
        RuleFor(r => r.FromAddress).HasMaxLength(320).IsEmail().When(r => !string.IsNullOrWhiteSpace(r.FromAddress));
        RuleFor(r => r.FromAddress).IsRequired().When(r => r.Enabled);
        RuleFor(r => r.FromName).HasMaxLength(100);
    }
}
