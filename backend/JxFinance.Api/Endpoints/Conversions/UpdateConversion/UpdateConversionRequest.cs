using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Conversions.UpdateConversion;

public sealed record UpdateConversionRequest(
    Guid Id,
    [property: Money] decimal FromAmount,
    Currency FromCurrency,
    [property: Money] decimal ToAmount,
    Currency ToCurrency,
    DateOnly Date,
    string? Description,
    [property: Money] decimal? FeeAmount = null,
    Currency? FeeCurrency = null,
    Guid? FeeCategoryId = null);
