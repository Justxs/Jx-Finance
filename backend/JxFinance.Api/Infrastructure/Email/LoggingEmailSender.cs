using Microsoft.Extensions.Logging;

namespace JxFinance.Infrastructure.Email;

/// <summary>
/// Default <see cref="IEmailSender"/> until real SMTP credentials exist (email is deferred, D53).
/// Logs the message instead of sending it, so the seam is ready to slot in a real sender later
/// without touching any caller.
/// </summary>
public sealed class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendAsync(string toEmail, string subject, string body, CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Email not sent (no SMTP configured) — To: {ToEmail}, Subject: {Subject}, Body: {Body}",
            toEmail,
            subject,
            body);
        return Task.CompletedTask;
    }
}
