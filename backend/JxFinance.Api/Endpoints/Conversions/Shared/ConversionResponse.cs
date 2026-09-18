using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Conversions.Shared;

public sealed record ConversionResponse(
    Guid Id,
    Guid AccountId,
    string FromAmount,
    Currency FromCurrency,
    string ToAmount,
    Currency ToCurrency,
    string Rate,
    DateOnly Date,
    string? Description,
    string? FeeAmount,
    Currency? FeeCurrency,
    Guid? FeeTransactionId,
    DateTimeOffset CreatedAt);
