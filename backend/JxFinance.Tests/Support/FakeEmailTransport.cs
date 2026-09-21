using System.Collections.Concurrent;
using JxFinance.Common.Email;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;

namespace JxFinance.Tests.Support;

public sealed class FakeEmailTransport : IEmailTransport
{
    private readonly ConcurrentQueue<SentEmail> sent = new();

    public string? FailWith { get; set; }

    public Exception? ThrowOnSend { get; set; }

    public IReadOnlyList<SentEmail> Sent => sent.ToList();

    public Task<Result> SendAsync(SmtpDelivery delivery, OutgoingEmail email, CancellationToken cancellationToken)
    {
        if (ThrowOnSend is { } failure)
        {
            throw failure;
        }

        if (FailWith is { } reason)
        {
            return Task.FromResult(Result.Failure(ErrorCodes.EmailSendFailed, reason));
        }

        sent.Enqueue(new SentEmail(delivery, email));
        return Task.FromResult(Result.Success());
    }

    public void Reset()
    {
        FailWith = null;
        ThrowOnSend = null;
        sent.Clear();
    }

    public IReadOnlyList<SentEmail> To(string address) =>
        Sent.Where(m => string.Equals(m.Email.ToAddress, address, StringComparison.OrdinalIgnoreCase)).ToList();
}

public sealed record SentEmail(SmtpDelivery Delivery, OutgoingEmail Email);
