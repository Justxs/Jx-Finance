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

        ValidationContext.Instance.ThrowError(
            result.ErrorMessage ?? "The request could not be completed.",
            result.ErrorCode ?? ErrorCodes.Validation,
            Severity.Error,
            ErrorCodes.StatusCodeFor(result.ErrorCode));
    }
}
