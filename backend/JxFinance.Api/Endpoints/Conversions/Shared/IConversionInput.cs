using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Conversions.Shared;

public interface IConversionInput
{
    decimal FromAmount { get; }
    Currency FromCurrency { get; }
    decimal ToAmount { get; }
    Currency ToCurrency { get; }
    DateOnly Date { get; }
    string? Description { get; }
    decimal? FeeAmount { get; }
    Currency? FeeCurrency { get; }
    Guid? FeeCategoryId { get; }
}
