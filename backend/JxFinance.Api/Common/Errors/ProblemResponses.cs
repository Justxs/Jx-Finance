using System.Text.Json;
using FastEndpoints;
using FluentValidation.Results;
using JxFinance.Common.Json;

namespace JxFinance.Common.Errors;

public static class ProblemResponses
{
    public const string SerializerErrorsField = "serializerErrors";

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

    public static object Build(List<ValidationFailure> failures, HttpContext context, int statusCode)
    {
        foreach (var failure in failures.Where(failure => !ErrorCodes.IsKnown(failure.ErrorCode)))
        {
            failure.ErrorCode = ErrorCodes.RequestMalformed;
        }

        return new ProblemDetails(failures, context.Request.Path, context.TraceIdentifier, statusCode);
    }
}
