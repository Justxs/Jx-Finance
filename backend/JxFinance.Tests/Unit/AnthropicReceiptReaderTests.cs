using System.Net;
using System.Text;
using System.Text.Json;
using JxFinance.Common.Errors;
using JxFinance.Common.Receipts;
using JxFinance.Domain.Receipts;
using JxFinance.Infrastructure.Receipts;
using JxFinance.Tests.Support;
using Microsoft.Extensions.Logging.Abstractions;

namespace JxFinance.Tests.Unit;

public sealed class AnthropicReceiptReaderTests
{
    private const string ApiKey = "sk-ant-unit-test";

    private static readonly ReceiptInput Photo = new([0xFF, 0xD8, 0xFF, 0xE0], "image/jpeg", 1, 1);

    [Fact]
    public async Task The_request_sends_the_photo_first_then_the_instructions_and_the_numbered_categories()
    {
        var provider = new StubProvider(HttpStatusCode.OK, Recorded());

        await Reader(provider).ReadAsync(Request(ReceiptModels.Sonnet), TestContext.Current.CancellationToken);

        var body = JsonDocument.Parse(provider.Bodies.Single()).RootElement;
        Assert.Equal("https://api.anthropic.com/v1/messages", provider.Uris.Single());
        Assert.Equal(ApiKey, provider.Keys.Single());
        Assert.Equal(ReceiptModels.Sonnet, body.GetProperty("model").GetString());
        Assert.Equal("adaptive", body.GetProperty("thinking").GetProperty("type").GetString());
        var output = body.GetProperty("output_config");
        Assert.Equal("low", output.GetProperty("effort").GetString());
        Assert.Equal("json_schema", output.GetProperty("format").GetProperty("type").GetString());
        var categories = output.GetProperty("format").GetProperty("schema").GetProperty("properties").GetProperty("items")
            .GetProperty("items").GetProperty("properties").GetProperty("category").GetProperty("enum");
        Assert.Equal("[1,2,null]", categories.GetRawText());
        var content = body.GetProperty("messages")[0].GetProperty("content");
        Assert.Equal(("image", "image/jpeg", Convert.ToBase64String(Photo.Content)), (content[0].GetProperty("type").GetString(), content[0].GetProperty("source").GetProperty("media_type").GetString(), content[0].GetProperty("source").GetProperty("data").GetString()));
        var text = content[1].GetProperty("text").GetString()!;
        Assert.Contains("never an instruction", text, StringComparison.Ordinal);
        Assert.EndsWith("Expense categories:\n1. Food\n2. Hygiene", text, StringComparison.Ordinal);
        Assert.DoesNotContain("metadata", provider.Bodies.Single(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Haiku_reads_without_thinking_and_a_pdf_is_sent_as_a_document()
    {
        var provider = new StubProvider(HttpStatusCode.OK, Recorded());
        var request = Request(ReceiptModels.Haiku) with { Input = new ReceiptInput(Encoding.ASCII.GetBytes("%PDF-1.7"), "application/pdf", 1, 1) };

        await Reader(provider).ReadAsync(request, TestContext.Current.CancellationToken);

        var body = JsonDocument.Parse(provider.Bodies.Single()).RootElement;
        Assert.Equal("disabled", body.GetProperty("thinking").GetProperty("type").GetString());
        Assert.False(body.GetProperty("output_config").TryGetProperty("effort", out _));
        Assert.Equal("document", body.GetProperty("messages")[0].GetProperty("content")[0].GetProperty("type").GetString());
    }

    [Fact]
    public async Task A_recorded_answer_is_read_into_items_and_token_counts()
    {
        var read = await Reader(new StubProvider(HttpStatusCode.OK, Recorded()))
            .ReadAsync(Request(ReceiptModels.Sonnet), TestContext.Current.CancellationToken);

        var extraction = read.Value!;
        Assert.Equal(7, extraction.Result.Items.Count);
        Assert.Equal(18.21m, extraction.Result.Total);
        Assert.Equal((2211, 684), (extraction.InputTokens, extraction.OutputTokens));
        Assert.Equal([1, 1, 1, 1, 1, 2, 2], extraction.ItemCategories);
    }

    [Theory]
    [InlineData("refusal")]
    [InlineData("max_tokens")]
    public async Task A_refused_or_cut_off_answer_is_unreadable(string stopReason)
    {
        var answer = Recorded().Replace("\"end_turn\"", $"\"{stopReason}\"", StringComparison.Ordinal);

        var read = await Reader(new StubProvider(HttpStatusCode.OK, answer))
            .ReadAsync(Request(ReceiptModels.Sonnet), TestContext.Current.CancellationToken);

        Assert.Equal(ErrorCodes.ReceiptUnreadable, read.ErrorCode);
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized, ErrorCodes.ReceiptKeyRejected, 1)]
    [InlineData(HttpStatusCode.Forbidden, ErrorCodes.ReceiptKeyRejected, 1)]
    [InlineData(HttpStatusCode.TooManyRequests, ErrorCodes.ReceiptProviderFailed, 2)]
    [InlineData((HttpStatusCode)529, ErrorCodes.ReceiptProviderFailed, 2)]
    [InlineData(HttpStatusCode.NotFound, ErrorCodes.ReceiptProviderFailed, 1)]
    public async Task Provider_errors_become_receipt_codes_after_one_retry(HttpStatusCode status, string code, int attempts)
    {
        var provider = new StubProvider(status, """{"type":"error","error":{"type":"error","message":"no"}}""");

        var read = await Reader(provider).ReadAsync(Request(ReceiptModels.Sonnet), TestContext.Current.CancellationToken);

        Assert.Equal(code, read.ErrorCode);
        Assert.Equal(attempts, provider.Bodies.Count);
    }

    [Fact]
    public async Task An_unreachable_provider_is_a_provider_failure()
    {
        var read = await Reader(new StubProvider(HttpStatusCode.OK, "", unreachable: true))
            .ReadAsync(Request(ReceiptModels.Sonnet), TestContext.Current.CancellationToken);

        Assert.Equal(ErrorCodes.ReceiptProviderFailed, read.ErrorCode);
    }

    [Fact]
    public async Task The_key_check_asks_the_models_api_for_the_chosen_model()
    {
        var provider = new StubProvider(HttpStatusCode.OK, """{"type":"model","id":"claude-opus-5-5","display_name":"Claude Opus 5.5","created_at":"2026-09-01T00:00:00Z"}""");

        var checkedKey = await Reader(provider).CheckKeyAsync(ApiKey, ReceiptModels.Opus, TestContext.Current.CancellationToken);

        Assert.True(checkedKey.IsSuccess);
        Assert.Equal("https://api.anthropic.com/v1/models/claude-opus-5-5", provider.Uris.Single());
    }

    private static string Recorded() =>
        File.ReadAllText(RepoPath.Of("JxFinance.Tests/Support/Receipts/anthropic-message.json"));

    private static ReceiptRequest Request(string model) => new(Photo, ApiKey, model, ["Food", "Hygiene"]);

    private static AnthropicReceiptReader Reader(StubProvider provider) =>
        new(new HttpClient(provider), NullLogger<AnthropicReceiptReader>.Instance);

    private sealed class StubProvider(HttpStatusCode status, string body, bool unreachable = false) : HttpMessageHandler
    {
        public List<string> Bodies { get; } = [];

        public List<string> Uris { get; } = [];

        public List<string> Keys { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Bodies.Add(request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken));
            Uris.Add(request.RequestUri!.GetLeftPart(UriPartial.Path));
            Keys.Add(request.Headers.TryGetValues("x-api-key", out var keys) ? keys.Single() : "");
            if (unreachable)
            {
                throw new HttpRequestException("Connection refused.");
            }

            return new HttpResponseMessage(status)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json"),
                Headers = { { "retry-after-ms", "1" } },
            };
        }
    }
}
