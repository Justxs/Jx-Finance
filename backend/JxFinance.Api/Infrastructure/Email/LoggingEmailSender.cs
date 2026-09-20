using FastEndpoints;

namespace JxFinance.Infrastructure.Email;

[RegisterService<IEmailSender>(LifeTime.Singleton)]
public sealed class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendAsync(string toEmail, string subject, string body, CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Email not sent (no SMTP configured). To: {ToEmail}, Subject: {Subject}",
            toEmail,
            subject);
        return Task.CompletedTask;
    }
}
