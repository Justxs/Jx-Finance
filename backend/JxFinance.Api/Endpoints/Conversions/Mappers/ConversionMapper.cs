using JxFinance.Domain.Common;
using System.Globalization;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Conversions.CreateConversion;
using JxFinance.Endpoints.Conversions.Shared;

namespace JxFinance.Endpoints.Conversions.Mappers;

[RegisterService<ConversionMapper>(LifeTime.Singleton)]
public sealed class ConversionMapper
{
    public CurrencyConversion ToEntity(CreateConversionRequest request, Transaction? fee) => new()
    {
        AccountId = new AccountId(request.AccountId),
        FromAmount = new Money(request.FromAmount, request.FromCurrency),
        ToAmount = new Money(request.ToAmount, request.ToCurrency),
        Date = request.Date,
        Description = OptionalText.Normalize(request.Description),
        FeeTransactionId = fee?.Id,
    };

    public ConversionResponse FromEntity(CurrencyConversion conversion, Transaction? fee) => new(
        conversion.Id.Value,
        conversion.AccountId.Value,
        conversion.FromAmount.Amount,
        conversion.FromAmount.Currency,
        conversion.ToAmount.Amount,
        conversion.ToAmount.Currency,
        decimal.Round(conversion.ToAmount.Amount / conversion.FromAmount.Amount, 6).ToString("0.000000", CultureInfo.InvariantCulture),
        conversion.Date,
        conversion.Description,
        fee?.Amount.Amount,
        fee?.Amount.Currency,
        fee?.Id.Value,
        conversion.CreatedAt);
}
