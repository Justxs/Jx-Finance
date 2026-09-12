namespace JxFinance.Common.Errors;

public static class ErrorCodes
{
    public const string NotFound = "not_found";
    public const string Validation = "validation";
    public const string Conflict = "conflict";
    public const string Forbidden = "forbidden";
    public const string Unauthorized = "unauthorized";

    public static int StatusCodeFor(string? errorCode) => errorCode switch
    {
        NotFound => StatusCodes.Status404NotFound,
        Conflict => StatusCodes.Status409Conflict,
        Forbidden => StatusCodes.Status403Forbidden,
        Unauthorized => StatusCodes.Status401Unauthorized,
        _ => StatusCodes.Status400BadRequest,
    };
}
