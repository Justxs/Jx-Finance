using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using System.Text;
using JxFinance.Common.Email;
using JxFinance.Common.Errors;
using JxFinance.Domain.Email;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Email;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace JxFinance.Tests.Unit;

public sealed class MailKitEmailTransportTests
{
    private static readonly OutgoingEmail Message = new("someone@example.com", "Someone", "Hello", "Body");

    [Fact]
    public async Task Credentials_are_never_sent_over_a_plaintext_connection()
    {
        await using var server = PlaintextSmtpServer.Start();

        var result = await Transport().SendAsync(Delivery(server.Port, SmtpEncryption.None, "relay", "relay-secret"), Message, TestContext.Current.CancellationToken);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.EmailInsecureConnection, result.ErrorCode);
        Assert.DoesNotContain(server.Commands, command => command.StartsWith("AUTH", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(server.Commands, command => command.Contains("relay-secret", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Starttls_is_required_and_a_server_without_it_is_refused()
    {
        await using var server = PlaintextSmtpServer.Start();

        var result = await Transport().SendAsync(Delivery(server.Port, SmtpEncryption.StartTls, "relay", "relay-secret"), Message, TestContext.Current.CancellationToken);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.EmailSendFailed, result.ErrorCode);
        Assert.DoesNotContain(server.Commands, command => command.StartsWith("AUTH", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(server.Commands, command => command.StartsWith("MAIL", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task An_anonymous_relay_without_encryption_still_works()
    {
        await using var server = PlaintextSmtpServer.Start();

        var result = await Transport().SendAsync(Delivery(server.Port, SmtpEncryption.None, null, null), Message, TestContext.Current.CancellationToken);

        Assert.True(result.IsSuccess, result.ErrorMessage);
        Assert.Contains(server.Commands, command => command.StartsWith("MAIL", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void The_default_encryption_is_starttls()
    {
        Assert.Equal(SmtpEncryption.StartTls, default(SmtpEncryption));
    }

    private static MailKitEmailTransport Transport() =>
        new(Options.Create(new AppOptions { Email = new EmailOptions { SendTimeoutSeconds = 5 } }), NullLogger<MailKitEmailTransport>.Instance);

    private static SmtpDelivery Delivery(int port, SmtpEncryption encryption, string? userName, string? password) =>
        new("127.0.0.1", port, encryption, userName, password, "finance@example.com", "Jx Finance");

    private sealed class PlaintextSmtpServer : IAsyncDisposable
    {
        private readonly TcpListener listener;
        private readonly CancellationTokenSource stop = new();
        private readonly Task serving;
        private readonly ConcurrentQueue<string> commands = new();

        private PlaintextSmtpServer()
        {
            listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            serving = ServeAsync(stop.Token);
        }

        public int Port => ((IPEndPoint)listener.LocalEndpoint).Port;

        public IReadOnlyList<string> Commands => commands.ToList();

        public static PlaintextSmtpServer Start() => new();

        public async ValueTask DisposeAsync()
        {
            await stop.CancelAsync();
            listener.Stop();
            try
            {
                await serving;
            }
            catch (Exception ex) when (ex is OperationCanceledException or SocketException or IOException or ObjectDisposedException)
            {
            }

            stop.Dispose();
        }

        private async Task ServeAsync(CancellationToken cancellationToken)
        {
            using var client = await listener.AcceptTcpClientAsync(cancellationToken);
            await using var stream = client.GetStream();
            using var reader = new StreamReader(stream, Encoding.ASCII);
            await using var writer = new StreamWriter(stream, Encoding.ASCII) { NewLine = "\r\n", AutoFlush = true };

            await writer.WriteLineAsync("220 fake ESMTP");
            while (await reader.ReadLineAsync(cancellationToken) is { } line)
            {
                commands.Enqueue(line);
                var verb = line.Split(' ')[0].ToUpperInvariant();
                switch (verb)
                {
                    case "EHLO":
                        await writer.WriteAsync("250-fake\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n");
                        break;
                    case "AUTH":
                        await writer.WriteLineAsync("235 2.7.0 Authentication successful");
                        break;
                    case "DATA":
                        await writer.WriteLineAsync("354 End data with <CR><LF>.<CR><LF>");
                        while (await reader.ReadLineAsync(cancellationToken) is { } data && data != ".")
                        {
                        }

                        await writer.WriteLineAsync("250 2.0.0 Queued");
                        break;
                    case "QUIT":
                        await writer.WriteLineAsync("221 2.0.0 Bye");
                        return;
                    default:
                        await writer.WriteLineAsync("250 2.0.0 OK");
                        break;
                }
            }
        }
    }
}
