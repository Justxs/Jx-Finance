using Anthropic;
using Anthropic.Exceptions;
using Anthropic.Models.Messages;
using JxFinance.Common.Errors;
using JxFinance.Common.Receipts;
using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Receipts;

public sealed class AnthropicReceiptReader(HttpClient http, ILogger<AnthropicReceiptReader> logger) : IReceiptReader
{
    public const string BaseUrl = "https://api.anthropic.com";

    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(60);

    private static readonly DomainError KeyRejected = new(
        ErrorCodes.ReceiptKeyRejected,
        "Anthropic did not accept the API key. Check it in Settings › Installation › Receipt reading.");

    private static readonly DomainError ProviderFailed = new(
        ErrorCodes.ReceiptProviderFailed,
        "Anthropic could not read the receipt right now. Try again in a minute.");

    public Task<Result<ReceiptExtraction>> ReadAsync(ReceiptRequest request, CancellationToken cancellationToken) =>
        CallAsync(
            request.ApiKey,
            request.Model,
            async client =>
            {
                var message = await client.Messages.Create(ReceiptPrompt.Build(request), cancellationToken);
                var inputTokens = (int)message.Usage.InputTokens;
                var outputTokens = (int)message.Usage.OutputTokens;
                logger.LogInformation(
                    "Receipt read by {Model}: stop reason {StopReason}, {InputTokens} input and {OutputTokens} output tokens.",
                    request.Model,
                    message.StopReason?.Raw(),
                    inputTokens,
                    outputTokens);

                if (message.StopReason?.Raw() is "refusal" or "max_tokens")
                {
                    return Result<ReceiptExtraction>.Failure(ReceiptAnswer.Unreadable);
                }

                var text = string.Concat(message.Content.Select(block => block.Value).OfType<TextBlock>().Select(block => block.Text));
                return ReceiptAnswer.Parse(text, request.Input, request.CategoryNames.Count, inputTokens, outputTokens);
            },
            cancellationToken);

    public async Task<Result> CheckKeyAsync(string apiKey, string model, CancellationToken cancellationToken)
    {
        var found = await CallAsync(
            apiKey,
            model,
            async client => Result<string>.Success((await client.Models.Retrieve(model, cancellationToken: cancellationToken)).ID),
            cancellationToken);
        return found.IsSuccess ? Result.Success() : Result.Failure(found.Error);
    }

    private async Task<Result<T>> CallAsync<T>(
        string apiKey,
        string model,
        Func<AnthropicClient, Task<Result<T>>> call,
        CancellationToken cancellationToken)
    {
        var client = new AnthropicClient
        {
            ApiKey = apiKey,
            BaseUrl = BaseUrl,
            HttpClient = http,
            Timeout = Timeout,
            MaxRetries = 1,
        };

        try
        {
            return await call(client);
        }
        catch (Exception ex) when (ex is AnthropicUnauthorizedException or AnthropicForbiddenException)
        {
            logger.LogWarning("Anthropic refused the API key for {Model}.", model);
            return Result<T>.Failure(KeyRejected);
        }
        catch (AnthropicApiException ex)
        {
            logger.LogWarning("Anthropic answered {StatusCode} for {Model}.", (int)ex.StatusCode, model);
            return Result<T>.Failure(ProviderFailed);
        }
        catch (Exception ex) when (ex is AnthropicIOException
            || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogWarning("Anthropic could not be reached for {Model}: {Error}.", model, ex.GetType().Name);
            return Result<T>.Failure(ProviderFailed);
        }
    }
}
