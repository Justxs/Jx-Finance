namespace JxFinance.Domain.Common;

public sealed class Result<T>
{
    private Result(bool isSuccess, T? value, string? errorCode, string? errorMessage)
    {
        IsSuccess = isSuccess;
        Value = value;
        ErrorCode = errorCode;
        ErrorMessage = errorMessage;
    }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public T? Value { get; }
    public string? ErrorCode { get; }
    public string? ErrorMessage { get; }

    public static Result<T> Success(T value) => new(true, value, null, null);

    public static Result<T> Failure(string code, string message) => new(false, default, code, message);

    public static Result<T> Failure(DomainError error) => Failure(error.Code, error.Message);

    public static Result<T> FailureFrom<TOther>(Result<TOther> failed) => Failure(failed.ErrorCode!, failed.ErrorMessage!);
}
