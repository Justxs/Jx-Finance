using JxFinance.Domain.Common;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace JxFinance.Infrastructure.Data;

public sealed class StronglyTypedIdConverter<TId>() : ValueConverter<TId, Guid>(id => id.Value, value => Create(value))
    where TId : struct, IStronglyTypedId<TId>
{
    private static TId Create(Guid value) => TId.From(value);
}

public sealed class CurrencyConverter() : ValueConverter<Currency, string>(currency => currency.ToCode(), code => CurrencyCode.Parse(code));

public sealed class MoneyConverter() : ValueConverter<Money, decimal>(money => money.Amount, value => new Money(value, Currency.Eur));
