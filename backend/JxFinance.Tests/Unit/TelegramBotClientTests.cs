using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using JxFinance.Common.Errors;
using JxFinance.Common.Telegram;
using JxFinance.Infrastructure.Telegram;

namespace JxFinance.Tests.Unit;

public sealed class TelegramBotClientTests
{
    private const string Token = "123456789:AAEhBP0av18z2kPqhh1EbM3Xyh9ZNeC9Q1k";

    [Fact]
    public async Task A_message_is_posted_as_html_to_the_bot_path_without_link_previews()
    {
        var http = new StubHttp(HttpStatusCode.OK, """{"ok":true,"result":{}}""");

        var result = await SendAsync(http);

        Assert.True(result.IsSuccess);
        Assert.Equal($"https://api.telegram.org/bot{Token}/sendMessage", http.Uri?.AbsoluteUri);
        var body = JsonNode.Parse(http.Body!)!;
        Assert.Equal(-1001234567890, body["chat_id"]!.GetValue<long>());
        Assert.Equal("<b>Hi</b>", body["text"]!.GetValue<string>());
        Assert.Equal("HTML", body["parse_mode"]!.GetValue<string>());
        Assert.True(body["link_preview_options"]!["is_disabled"]!.GetValue<bool>());
    }

    [Fact]
    public async Task Rate_limiting_carries_telegrams_retry_after()
    {
        var result = await SendAsync(new StubHttp(
            HttpStatusCode.TooManyRequests,
            """{"ok":false,"error_code":429,"description":"Too Many Requests","parameters":{"retry_after":17}}"""));

        Assert.Equal(ErrorCodes.TelegramRateLimited, result.Error?.Code);
        Assert.Equal(TimeSpan.FromSeconds(17), result.RetryAfter);
    }

    [Fact]
    public async Task A_group_that_became_a_supergroup_answers_its_new_id()
    {
        var result = await SendAsync(new StubHttp(
            HttpStatusCode.BadRequest,
            """{"ok":false,"error_code":400,"description":"Bad Request: group chat was upgraded to a supergroup chat","parameters":{"migrate_to_chat_id":-1009876543210}}"""));

        Assert.Equal(ErrorCodes.TelegramRejected, result.Error?.Code);
        Assert.Equal(-1009876543210, result.MigrateToChatId);
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized, ErrorCodes.TelegramBotRemoved)]
    [InlineData(HttpStatusCode.Forbidden, ErrorCodes.TelegramBotRemoved)]
    [InlineData(HttpStatusCode.BadRequest, ErrorCodes.TelegramRejected)]
    [InlineData(HttpStatusCode.BadGateway, ErrorCodes.TelegramSendFailed)]
    public async Task Failures_map_to_their_codes(HttpStatusCode status, string code)
    {
        var result = await SendAsync(new StubHttp(
            status,
            """{"ok":false,"description":"Bad Request: chat not found"}"""));

        Assert.Equal(code, result.Error?.Code);
        Assert.Null(result.MigrateToChatId);
    }

    [Fact]
    public async Task A_rejection_quotes_telegrams_reason()
    {
        var result = await SendAsync(new StubHttp(
            HttpStatusCode.BadRequest,
            """{"ok":false,"description":"Bad Request: chat not found"}"""));

        Assert.Contains("chat not found", result.Error?.Message, StringComparison.Ordinal);
    }

    private static Task<TelegramSendResult> SendAsync(StubHttp http) =>
        new TelegramBotClient(new HttpClient(http) { BaseAddress = new Uri(TelegramBotClient.BaseAddress) })
            .SendAsync(new TelegramTarget(Token, -1001234567890), "<b>Hi</b>", TestContext.Current.CancellationToken);

    private sealed class StubHttp(HttpStatusCode status, string answer) : HttpMessageHandler
    {
        public Uri? Uri { get; private set; }

        public string? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Uri = request.RequestUri;
            Body = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(status) { Content = new StringContent(answer, Encoding.UTF8, "application/json") };
        }
    }
}
