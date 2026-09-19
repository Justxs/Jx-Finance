using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Conversions.CreateConversion;

public sealed record CreateConversionRequest(
    Guid AccountId,
    [property: Money] decimal FromAmount,
    Currency FromCurrency,
    [property: Money] decimal ToAmount,
    Currency ToCurrency,
    DateOnly Date,
    string? Description,
    [property: Money] decimal? FeeAmount = null,
    Currency? FeeCurrency = null,
    Guid? FeeCategoryId = null);
