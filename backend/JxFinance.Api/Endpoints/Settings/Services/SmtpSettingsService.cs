using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Email;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Endpoints.Settings.UpdateSmtpSettings;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;

namespace JxFinance.Endpoints.Settings.Services;

[RegisterService<ISmtpSettingsService>(LifeTime.Scoped)]
public sealed class SmtpSettingsService(
    AppDbContext db,
    IInstanceSettingsStore store,
    IEmailDelivery emails,
    IAuthService authService,
    IDataProtectionProvider protection) : ISmtpSettingsService
{
    public SmtpSettingsResponse GetSmtp() => ToResponse(store.Current.Smtp);

    public async Task<Result<SmtpSettingsResponse>> UpdateSmtpAsync(
        UpdateSmtpSettingsRequest request,
        CancellationToken cancellationToken) =>
        await StoredSettings.UpdateAsync(db, store, settings => Task.FromResult(ApplySmtp(request, settings)), cancellationToken) is { } error
            ? error
            : ToResponse(store.Current.Smtp);

    private DomainError? ApplySmtp(UpdateSmtpSettingsRequest request, InstanceSettings settings)
    {
        var userName = OptionalText.Normalize(request.UserName);
        var host = OptionalText.Normalize(request.Host);
        var password = OptionalText.Normalize(request.Password);
        if (userName is not null
            && password is null
            && settings.SmtpProtectedPassword.Length > 0
            && (!SameText(host, settings.SmtpHost, StringComparison.OrdinalIgnoreCase)
                || !SameText(userName, settings.SmtpUserName, StringComparison.Ordinal)))
        {
            return new DomainError(
                ErrorCodes.EmailPasswordRequired,
                "Enter the password again: the stored one is only kept for the same mail server and user name.");
        }

        settings.SmtpEnabled = request.Enabled;
        settings.SmtpHost = host;
        settings.SmtpPort = request.Port;
        settings.SmtpEncryption = request.Encryption;
        settings.SmtpUserName = userName;
        settings.SmtpFromAddress = OptionalText.Normalize(request.FromAddress);
        settings.SmtpFromName = OptionalText.Normalize(request.FromName);

        if (userName is null)
        {
            settings.SmtpProtectedPassword = string.Empty;
        }
        else if (password is not null)
        {
            settings.SmtpProtectedPassword = protection.Protect(EmailDelivery.ProtectorPurpose, password);
        }

        return null;
    }

    public async Task<Result<SmtpTestResponse>> SendTestEmailAsync(CancellationToken cancellationToken)
    {
        if (await authService.CurrentAsync(cancellationToken) is not { Email: { } address } administrator)
        {
            return EntityLookup.NotFound("User not found.");
        }

        var settings = store.Current;
        var sent = await emails.SendAsync(
            EmailTexts.Test(
                administrator.Language ?? settings.DefaultLanguage,
                address,
                administrator.DisplayName,
                EmailTexts.Product(settings.InstanceName)),
            cancellationToken);

        return sent.IsSuccess ? new SmtpTestResponse(address) : sent.Error;
    }

    private static bool SameText(string? requested, string? stored, StringComparison comparison) =>
        string.Equals(requested, OptionalText.Normalize(stored), comparison);

    private static SmtpSettingsResponse ToResponse(SmtpSettingsSnapshot smtp) => new(
        smtp.Enabled,
        smtp.Host,
        smtp.Port,
        smtp.Encryption,
        smtp.UserName,
        smtp.HasPassword,
        smtp.FromAddress,
        smtp.FromName);
}
