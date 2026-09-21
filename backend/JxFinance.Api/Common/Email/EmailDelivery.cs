using System.Security.Cryptography;
using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Configuration;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;

namespace JxFinance.Common.Email;

[RegisterService<IEmailDelivery>(LifeTime.Scoped)]
public sealed class EmailDelivery(
    IInstanceSettingsStore store,
    IEmailTransport transport,
    IDataProtectionProvider protection,
    IOptions<AppOptions> options) : IEmailDelivery
{
    public const string ProtectorPurpose = "JxFinance.Smtp.Password";

    public bool IsConfigured => store.Current.Smtp.IsConfigured;

    public async Task<Result> SendAsync(OutgoingEmail email, CancellationToken cancellationToken)
    {
        var delivery = Resolve(store.Current.Smtp);
        if (delivery.IsFailure)
        {
            return delivery.Error;
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Max(options.Value.Email.SendTimeoutSeconds, 1)));
        try
        {
            return await transport.SendAsync(delivery.Value!, email, timeout.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return new DomainError(ErrorCodes.EmailSendFailed, "The mail server did not answer in time.");
        }
    }

    public Result<SmtpDelivery> Resolve(SmtpSettingsSnapshot smtp)
    {
        if (!smtp.IsConfigured)
        {
            return new DomainError(
                ErrorCodes.EmailNotConfigured,
                "Email is switched off, or the server and sender address are missing.");
        }

        string? password = null;
        if (smtp.HasPassword)
        {
            try
            {
                password = protection.CreateProtector(ProtectorPurpose).Unprotect(smtp.ProtectedPassword);
            }
            catch (CryptographicException)
            {
                return new DomainError(
                    ErrorCodes.EmailPasswordUnreadable,
                    "The stored mail server password can no longer be read. Enter it again.");
            }
        }

        return new SmtpDelivery(
            smtp.Host!,
            smtp.Port,
            smtp.Encryption,
            smtp.UserName,
            password,
            smtp.FromAddress!,
            smtp.FromName ?? smtp.FromAddress!);
    }
}
