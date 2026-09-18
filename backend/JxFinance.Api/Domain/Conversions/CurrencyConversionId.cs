namespace JxFinance.Domain.Conversions;

public readonly record struct CurrencyConversionId(Guid Value)
{
    public static CurrencyConversionId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
