using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Conversions.Shared;

public sealed record ConversionResponse(
    Guid Id,
    Guid AccountId,
    [property: Money] decimal FromAmount,
    Currency FromCurrency,
    [property: Money] decimal ToAmount,
    Currency ToCurrency,
    string Rate,
    DateOnly Date,
    string? Description,
    [property: Money] decimal? FeeAmount,
    Currency? FeeCurrency,
    Guid? FeeTransactionId,
    DateTimeOffset CreatedAt,
    Guid? FeeCategoryId,
    bool IsImported);
