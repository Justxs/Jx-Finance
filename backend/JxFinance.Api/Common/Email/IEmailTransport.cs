using JxFinance.Domain.Common;

namespace JxFinance.Common.Email;

public interface IEmailTransport
{
    Task<Result> SendAsync(SmtpDelivery delivery, OutgoingEmail email, CancellationToken cancellationToken);
}
