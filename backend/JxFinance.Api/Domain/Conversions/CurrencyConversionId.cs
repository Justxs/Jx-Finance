using JxFinance.Domain.Common;

namespace JxFinance.Domain.Conversions;

public readonly record struct CurrencyConversionId(Guid Value) : IStronglyTypedId<CurrencyConversionId>
{
    public static CurrencyConversionId From(Guid value) => new(value);

    public static CurrencyConversionId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
