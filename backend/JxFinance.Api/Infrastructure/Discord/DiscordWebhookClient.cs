using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using JxFinance.Common;
using JxFinance.Common.Discord;
using JxFinance.Common.Email;
using JxFinance.Common.Errors;

namespace JxFinance.Infrastructure.Discord;

public sealed class DiscordWebhookClient(HttpClient http) : IDiscordWebhookClient
{
    public const string BaseAddress = "https://discord.com/";
    public const string HostName = "discord.com";

    private const int MessageMaxLength = 300;
    private const int LedgerNavy = 0x253E52;
    private static readonly TimeSpan DefaultRetryAfter = TimeSpan.FromSeconds(30);

    public async Task<DiscordSendResult> SendAsync(DiscordTarget target, DiscordPost post, CancellationToken cancellationToken)
    {
        var path = $"api/webhooks/{target.Id}/{target.Token}";
        var body = new WebhookBody(
            post.Username,
            [new Embed(post.Content, LedgerNavy, new EmbedFooter(EmailTexts.DefaultProduct))],
            new AllowedMentions([]));
        try
        {
            using var response = await http.PostAsJsonAsync(path, body, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return DiscordSendResult.Success;
            }

            var text = await response.Content.ReadAsStringAsync(cancellationToken);
            return response.StatusCode switch
            {
                HttpStatusCode.TooManyRequests => DiscordSendResult.Failure(
                    ErrorCodes.DiscordRateLimited,
                    "Discord asked to slow down.",
                    RetryAfter(response, text)),
                HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden or HttpStatusCode.NotFound =>
                    DiscordSendResult.Failure(
                        ErrorCodes.DiscordWebhookGone,
                        "Discord says this webhook no longer exists. Create a new one and paste its URL."),
                >= HttpStatusCode.InternalServerError => DiscordSendResult.Failure(
                    ErrorCodes.DiscordSendFailed,
                    $"Discord answered {(int)response.StatusCode}. Try again later."),
                _ => DiscordSendResult.Failure(
                    ErrorCodes.DiscordRejected,
                    $"Discord rejected the message: {TextLimit.Cut(DiscordMessage(text), MessageMaxLength)}"),
            };
        }
        catch (Exception ex) when (ex is HttpRequestException
            || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            return DiscordSendResult.Failure(ErrorCodes.DiscordSendFailed, "Discord could not be reached. Try again later.");
        }
    }

    private static TimeSpan RetryAfter(HttpResponseMessage response, string body)
    {
        try
        {
            using var document = JsonDocument.Parse(body);
            if (document.RootElement.TryGetProperty("retry_after", out var seconds) && seconds.TryGetDouble(out var value))
            {
                return TimeSpan.FromSeconds(Math.Clamp(value, 1, 3600));
            }
        }
        catch (JsonException)
        {
        }

        return response.Headers.RetryAfter?.Delta ?? DefaultRetryAfter;
    }

    private static string DiscordMessage(string body)
    {
        try
        {
            using var document = JsonDocument.Parse(body);
            if (document.RootElement.TryGetProperty("message", out var message) && message.GetString() is { } text)
            {
                return text;
            }
        }
        catch (JsonException)
        {
        }

        return string.IsNullOrWhiteSpace(body) ? "no reason given" : body;
    }

    private sealed record WebhookBody(
        [property: JsonPropertyName("username")] string Username,
        [property: JsonPropertyName("embeds")] IReadOnlyList<Embed> Embeds,
        [property: JsonPropertyName("allowed_mentions")] AllowedMentions AllowedMentions);

    private sealed record Embed(
        [property: JsonPropertyName("description")] string Description,
        [property: JsonPropertyName("color")] int Color,
        [property: JsonPropertyName("footer")] EmbedFooter Footer);

    private sealed record EmbedFooter([property: JsonPropertyName("text")] string Text);

    private sealed record AllowedMentions([property: JsonPropertyName("parse")] IReadOnlyList<string> Parse);
}
