using System.Text.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.Investments;

public static class AllocationBucket
{
    private static readonly HashSet<string> TypeKeys = Enum.GetValues<SecurityType>().Select(Of).ToHashSet(StringComparer.Ordinal);

    private static readonly HashSet<string> CurrencyKeys = Enum.GetValues<Currency>().Select(Of).ToHashSet(StringComparer.Ordinal);

    public static string Of(SecurityType type) => JsonNamingPolicy.CamelCase.ConvertName(type.ToString());

    public static string Of(Currency currency) => JsonNamingPolicy.CamelCase.ConvertName(currency.ToString());

    public static string Of(SecurityId security) => security.Value.ToString();

    public static bool IsWellFormed(AllocationDimension dimension, string? key) => key is not null && dimension switch
    {
        AllocationDimension.Type => TypeKeys.Contains(key),
        AllocationDimension.Currency => CurrencyKeys.Contains(key),
        AllocationDimension.Security => Guid.TryParseExact(key, "D", out var id) && id != Guid.Empty && Of(new SecurityId(id)) == key,
        _ => false,
    };
}
