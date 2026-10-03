using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Telegram;
using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Telegram;

public sealed class TelegramBotClient(HttpClient http) : ITelegramBotClient
{
    public const string BaseAddress = "https://api.telegram.org/";
    public const string HostName = "api.telegram.org";

    private const int MessageMaxLength = 300;
    private static readonly TimeSpan DefaultRetryAfter = TimeSpan.FromSeconds(30);

    public async Task<TelegramSendResult> SendAsync(TelegramTarget target, string html, CancellationToken cancellationToken)
    {
        var body = new SendMessageBody(target.ChatId, html, "HTML", new LinkPreviewOptions(true));
        try
        {
            using var response = await http.PostAsJsonAsync($"/bot{target.Token}/sendMessage", body, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return TelegramSendResult.Success;
            }

            var answer = Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            return response.StatusCode switch
            {
                HttpStatusCode.TooManyRequests => TelegramSendResult.Failure(
                    ErrorCodes.TelegramRateLimited,
                    "Telegram asked to slow down.",
                    answer?.Parameters?.RetryAfter is { } seconds
                        ? TimeSpan.FromSeconds(Math.Clamp(seconds, 1, 3600))
                        : DefaultRetryAfter),
                HttpStatusCode.BadRequest when answer?.Parameters?.MigrateToChatId is { } moved => new TelegramSendResult(
                    new DomainError(ErrorCodes.TelegramRejected, "The Telegram group moved to a new chat id."),
                    MigrateToChatId: moved),
                HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => TelegramSendResult.Failure(
                    ErrorCodes.TelegramBotRemoved,
                    "Telegram says the bot was removed from the group or its token was revoked."),
                >= HttpStatusCode.InternalServerError => TelegramSendResult.Failure(
                    ErrorCodes.TelegramSendFailed,
                    $"Telegram answered {(int)response.StatusCode}. Try again later."),
                _ => TelegramSendResult.Failure(
                    ErrorCodes.TelegramRejected,
                    $"Telegram rejected the message: {TextLimit.Cut(Reason(answer), MessageMaxLength)}"),
            };
        }
        catch (Exception ex) when (ex is HttpRequestException
            || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            return TelegramSendResult.Failure(ErrorCodes.TelegramSendFailed, "Telegram could not be reached. Try again later.");
        }
    }

    private static Answer? Parse(string body)
    {
        try
        {
            return JsonSerializer.Deserialize<Answer>(body);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string Reason(Answer? answer) =>
        string.IsNullOrWhiteSpace(answer?.Description) ? "no reason given" : answer.Description;

    private sealed record SendMessageBody(
        [property: JsonPropertyName("chat_id")] long ChatId,
        [property: JsonPropertyName("text")] string Text,
        [property: JsonPropertyName("parse_mode")] string ParseMode,
        [property: JsonPropertyName("link_preview_options")] LinkPreviewOptions LinkPreviewOptions);

    private sealed record LinkPreviewOptions([property: JsonPropertyName("is_disabled")] bool IsDisabled);

    private sealed record Answer(
        [property: JsonPropertyName("description")] string? Description,
        [property: JsonPropertyName("parameters")] AnswerParameters? Parameters);

    private sealed record AnswerParameters(
        [property: JsonPropertyName("retry_after")] int? RetryAfter,
        [property: JsonPropertyName("migrate_to_chat_id")] long? MigrateToChatId);
}
