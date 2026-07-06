using JxFinance.Domain.Common;

namespace JxFinance.Common.Errors;

public static class ResultExtensions
{
    public static IResult ToProblemResult<T>(this Result<T> result)
    {
        if (result.IsSuccess)
        {
            throw new InvalidOperationException("Cannot convert a successful result to a problem response.");
        }

        return Results.Problem(
            detail: result.ErrorMessage,
            statusCode: StatusCodeFor(result.ErrorCode),
            extensions: new Dictionary<string, object?> { ["errorCode"] = result.ErrorCode });
    }

    private static int StatusCodeFor(string? errorCode) => errorCode switch
    {
        ErrorCodes.NotFound => StatusCodes.Status404NotFound,
        ErrorCodes.Conflict => StatusCodes.Status409Conflict,
        ErrorCodes.Forbidden => StatusCodes.Status403Forbidden,
        ErrorCodes.Unauthorized => StatusCodes.Status401Unauthorized,
        _ => StatusCodes.Status400BadRequest,
    };
}
