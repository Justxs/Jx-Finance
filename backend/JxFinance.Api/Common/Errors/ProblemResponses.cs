using System.Text.Json;
using FastEndpoints;
using FluentValidation;
using FluentValidation.Results;
using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Common.Errors;

public static class ProblemResponses
{
    public const string SerializerErrorsField = "serializerErrors";
    public const string GeneralErrorsField = "GeneralErrors";
    public const string ClientErrorTitle = "One or more validation errors occurred.";
    public const string ServerErrorTitle = "An error occurred while processing your request.";

    private const string RootPath = "$";
    private const string RootArrayPrefix = "$[";

    public static ValidationFailure FromJsonException(JsonException exception)
    {
        var bindException = exception as JsonBindException;
        var name = exception.Path is null or RootPath || exception.Path.StartsWith(RootArrayPrefix, StringComparison.Ordinal)
            ? bindException?.FieldName ?? SerializerErrorsField
            : exception.Path[2..];

        return new ValidationFailure(name, bindException?.FailureMessage ?? exception.InnerException?.Message ?? exception.Message)
        {
            ErrorCode = exception is DecimalStringException ? ErrorCodes.DecimalMalformed : ErrorCodes.RequestMalformed,
        };
    }

    public static ValidationFailure FromDomainError(DomainError error) =>
        new(GeneralErrorsField, error.Message)
        {
            ErrorCode = error.Code,
            Severity = Severity.Error,
        };

    public static object Build(List<ValidationFailure> failures, HttpContext context, int statusCode)
    {
        foreach (var failure in failures.Where(failure => !ErrorCodes.IsKnown(failure.ErrorCode)))
        {
            failure.ErrorCode = ErrorCodes.RequestMalformed;
        }

        return new ProblemDetails(failures, context.Request.Path, context.TraceIdentifier, statusCode);
    }

    public static string TitleFor(ProblemDetails problem) =>
        problem.Status >= StatusCodes.Status500InternalServerError ? ServerErrorTitle : ClientErrorTitle;

    public static Task WriteAsync(HttpContext context, DomainError error) =>
        context.Response.SendErrorsAsync([FromDomainError(error)], ErrorCodes.StatusCodeFor(error.Code), null, context.RequestAborted);

    public static Task WriteServerErrorAsync(HttpContext context) =>
        context.Response.SendErrorsAsync([], context.Response.StatusCode, null, context.RequestAborted);
}
