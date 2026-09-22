using FastEndpoints;
using FluentValidation;
using FluentValidation.Results;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;

namespace JxFinance.Common;

public static class ResultResponses
{
    public static Task ProblemAsync<TRequest, TResponse>(
        this ResponseSender<TRequest, TResponse> send,
        DomainError error,
        CancellationToken ct)
        where TRequest : notnull =>
        send.ProblemAsync(error, ErrorCodes.StatusCodeFor(error.Code), ct);

    public static Task ProblemAsync<TRequest, TResponse>(
        this ResponseSender<TRequest, TResponse> send,
        DomainError error,
        int statusCode,
        CancellationToken ct)
        where TRequest : notnull
    {
        send.ValidationFailures.Add(
            new ValidationFailure(ProblemResponses.GeneralErrorsField, error.Message)
            {
                ErrorCode = error.Code,
                Severity = Severity.Error,
            });
        return send.ErrorsAsync(statusCode, ct);
    }

    public static Task OkOrProblemAsync<TRequest, TResponse>(
        this ResponseSender<TRequest, TResponse> send,
        Result<TResponse> result,
        CancellationToken ct)
        where TRequest : notnull =>
        result.TryGetValue(out var value) ? send.OkAsync(value, ct) : send.ProblemAsync(result.Error, ct);

    public static Task NoContentOrProblemAsync<TRequest, TResponse>(
        this ResponseSender<TRequest, TResponse> send,
        Result result,
        CancellationToken ct)
        where TRequest : notnull =>
        result.IsSuccess ? send.NoContentAsync(ct) : send.ProblemAsync(result.Error, ct);

    public static Task NoContentOrProblemAsync<TRequest, TResponse, TValue>(
        this ResponseSender<TRequest, TResponse> send,
        Result<TValue> result,
        CancellationToken ct)
        where TRequest : notnull =>
        result.IsSuccess ? send.NoContentAsync(ct) : send.ProblemAsync(result.Error, ct);

    public static Task CreatedAsync<TRequest, TResponse>(
        this ResponseSender<TRequest, TResponse> send,
        string location,
        TResponse body,
        CancellationToken ct)
        where TRequest : notnull
    {
        send.HttpContext.Response.Headers.Location = location;
        return send.ResponseAsync(body, StatusCodes.Status201Created, ct);
    }

    public static Task CreatedOrProblemAsync<TRequest, TResponse>(
        this ResponseSender<TRequest, TResponse> send,
        Result<TResponse> result,
        Func<TResponse, string> location,
        CancellationToken ct)
        where TRequest : notnull =>
        result.TryGetValue(out var value)
            ? send.CreatedAsync(location(value), value, ct)
            : send.ProblemAsync(result.Error, ct);
}
