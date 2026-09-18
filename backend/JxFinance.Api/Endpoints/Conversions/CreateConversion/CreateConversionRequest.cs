using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Conversions.CreateConversion;

public sealed record CreateConversionRequest(
    Guid AccountId,
    string FromAmount,
    Currency FromCurrency,
    string ToAmount,
    Currency ToCurrency,
    DateOnly Date,
    string? Description,
    string? FeeAmount = null,
    Currency? FeeCurrency = null,
    Guid? FeeCategoryId = null);
