using System.Diagnostics.CodeAnalysis;

namespace JxFinance.Domain.Common;

public sealed class Result
{
    private static readonly Result Succeeded = new(null);

    private Result(DomainError? error) => FailureError = error;

    private DomainError? FailureError { get; }

    public bool IsSuccess => FailureError is null;
    public bool IsFailure => !IsSuccess;
    public string? ErrorCode => FailureError?.Code;
    public string? ErrorMessage => FailureError?.Message;
    public DomainError Error => FailureError!;

    public static Result Success() => Succeeded;

    public static Result Failure(string code, string message) => new(new DomainError(code, message));

    public static Result Failure(DomainError error) => new(error);

    public static implicit operator Result(DomainError error) => Failure(error);
}

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
    public DomainError Error => new(ErrorCode!, ErrorMessage!);

    public bool TryGetValue([NotNullWhen(true)] out T? value)
    {
        value = Value;
        return IsSuccess;
    }

    public Result<TOut> Map<TOut>(Func<T, TOut> map) =>
        IsSuccess ? map(Value!) : Result<TOut>.Failure(ErrorCode!, ErrorMessage!);

    public static Result<T> Success(T value) => new(true, value, null, null);

    public static Result<T> Failure(string code, string message) => new(false, default, code, message);

    public static Result<T> Failure(DomainError error) => Failure(error.Code, error.Message);

    public static implicit operator Result<T>(T value) => Success(value);

    public static implicit operator Result<T>(DomainError error) => Failure(error);
}
