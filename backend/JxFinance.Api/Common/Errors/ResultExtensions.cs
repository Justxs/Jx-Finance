using FastEndpoints;
using FluentValidation;
using JxFinance.Domain.Common;

namespace JxFinance.Common.Errors;

public static class ResultExtensions
{
    public static T ValueOrThrow<T>(this Result<T> result)
    {
        result.EnsureSuccess();
        return result.Value!;
    }

    public static void EnsureSuccess<T>(this Result<T> result)
    {
        if (result.IsSuccess) return;

        Throw(result.ErrorCode, result.ErrorMessage);
    }

    public static void EnsureSuccess(this Result result)
    {
        if (result.IsSuccess) return;

        Throw(result.ErrorCode, result.ErrorMessage);
    }

    private static void Throw(string? code, string? message) =>
        ValidationContext.Instance.ThrowError(
            message ?? "The request could not be completed.",
            code ?? ErrorCodes.RequestInvalid,
            Severity.Error,
            ErrorCodes.StatusCodeFor(code));
}
