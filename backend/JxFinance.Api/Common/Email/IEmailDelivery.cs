using JxFinance.Domain.Common;

namespace JxFinance.Common.Email;

public interface IEmailDelivery
{
    bool IsConfigured { get; }

    Task<Result> SendAsync(OutgoingEmail email, CancellationToken cancellationToken);
}
