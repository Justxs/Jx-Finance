using JxFinance.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace JxFinance.Common.Errors;

public static class ResultExtensions
{
    public static ProblemDetails ToProblemDetails<T>(this Result<T> result)
    {
        if (result.IsSuccess)
        {
            throw new InvalidOperationException("Cannot convert a successful result to ProblemDetails.");
        }

        var statusCode = StatusCodeFor(result.ErrorCode);
        return new ProblemDetails
        {
            Status = statusCode,
            Title = ReasonPhrases.For(statusCode),
            Detail = result.ErrorMessage,
            Extensions = { ["errorCode"] = result.ErrorCode },
        };
    }

    private static int StatusCodeFor(string? errorCode) => errorCode switch
    {
        ErrorCodes.NotFound => StatusCodes.Status404NotFound,
        ErrorCodes.Conflict => StatusCodes.Status409Conflict,
        ErrorCodes.Forbidden => StatusCodes.Status403Forbidden,
        _ => StatusCodes.Status400BadRequest,
    };

    private static class ReasonPhrases
    {
        public static string For(int statusCode) => statusCode switch
        {
            StatusCodes.Status404NotFound => "Not Found",
            StatusCodes.Status409Conflict => "Conflict",
            StatusCodes.Status403Forbidden => "Forbidden",
            _ => "Bad Request",
        };
    }
}
