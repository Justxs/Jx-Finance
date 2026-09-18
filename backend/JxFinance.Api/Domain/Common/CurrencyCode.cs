namespace JxFinance.Domain.Common;

public static class CurrencyCode
{
    public static string ToCode(this Currency currency) => currency.ToString().ToUpperInvariant();

    public static bool TryParse(string? code, out Currency currency)
    {
        currency = default;
        return !string.IsNullOrWhiteSpace(code)
            && code.Trim().Length == 3
            && Enum.TryParse(code.Trim(), ignoreCase: true, out currency)
            && Enum.IsDefined(currency);
    }

    public static Currency Parse(string code) =>
        TryParse(code, out var currency)
            ? currency
            : throw new FormatException($"Unknown currency code '{code}'.");
}
