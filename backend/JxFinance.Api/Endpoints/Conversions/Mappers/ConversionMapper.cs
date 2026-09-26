using System.Globalization;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Conversions.CreateConversion;
using JxFinance.Endpoints.Conversions.Shared;

namespace JxFinance.Endpoints.Conversions.Mappers;

public static class ConversionMapper
{
    public static CurrencyConversion ToEntity(this CreateConversionRequest request, Transaction? fee)
    {
        var conversion = new CurrencyConversion { AccountId = new AccountId(request.AccountId) };
        request.ApplyTo(conversion, fee);
        return conversion;
    }

    public static void ApplyTo(this IConversionInput input, CurrencyConversion conversion, Transaction? fee)
    {
        conversion.FromAmount = new Money(input.FromAmount, input.FromCurrency);
        conversion.ToAmount = new Money(input.ToAmount, input.ToCurrency);
        conversion.Date = input.Date;
        conversion.Description = OptionalText.Normalize(input.Description);
        conversion.FeeTransactionId = fee?.Id;
    }

    public static ConversionResponse ToResponse(this CurrencyConversion conversion, Transaction? fee) =>
        conversion.ToResponse(fee is null ? null : new ConversionFee(fee.Id, fee.Amount, fee.CategoryId));

    public static ConversionResponse ToResponse(this CurrencyConversion conversion, ConversionFee? fee) => new(
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
        conversion.CreatedAt,
        fee?.CategoryId?.Value,
        conversion.ImportRef is not null);
}
