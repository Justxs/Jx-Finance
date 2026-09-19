using System.Xml;
using System.Xml.Linq;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Brokers.InteractiveBrokers;

public sealed class FlexClient(HttpClient http) : IFlexClient
{
    private const int MaxAttempts = 6;
    private const string NotReadyCode = "1019";
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(5);

    public async Task<Result<Stream>> DownloadAsync(string token, string queryId, CancellationToken cancellationToken)
    {
        try
        {
            var request = Load(await http.GetByteArrayAsync(
                $"SendRequest?t={Uri.EscapeDataString(token)}&q={Uri.EscapeDataString(queryId)}&v=3",
                cancellationToken));
            if (request.Root?.Element("ReferenceCode")?.Value is not { } reference)
            {
                return Failure(request);
            }

            for (var attempt = 0; attempt < MaxAttempts; attempt++)
            {
                var body = await http.GetByteArrayAsync(
                    $"GetStatement?t={Uri.EscapeDataString(token)}&q={Uri.EscapeDataString(reference)}&v=3",
                    cancellationToken);
                var response = Load(body);
                if (response.Root?.Name.LocalName == "FlexQueryResponse")
                {
                    return Result<Stream>.Success(new MemoryStream(body));
                }

                if (response.Root?.Element("ErrorCode")?.Value != NotReadyCode)
                {
                    return Failure(response);
                }

                await Task.Delay(RetryDelay, cancellationToken);
            }

            return Result<Stream>.Failure(
                ErrorCodes.Validation,
                "Interactive Brokers is still preparing the report. Try again in a few minutes.");
        }
        catch (Exception ex) when (ex is HttpRequestException or XmlException
            || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            return Result<Stream>.Failure(ErrorCodes.Validation, "Interactive Brokers could not be reached. Try again later.");
        }
    }

    private static XDocument Load(byte[] body)
    {
        var settings = new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null };
        using var reader = XmlReader.Create(new MemoryStream(body), settings);
        return XDocument.Load(reader);
    }

    private static Result<Stream> Failure(XDocument response)
    {
        var message = response.Root?.Element("ErrorMessage")?.Value ?? "unknown error";
        return Result<Stream>.Failure(
            ErrorCodes.Validation,
            $"Interactive Brokers rejected the request: {(message.Length > 300 ? message[..300] : message)}");
    }
}
