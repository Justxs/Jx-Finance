using JxFinance.Domain.Common;

namespace JxFinance.Domain.Investments;

public sealed class Security : EntityBase
{
    public const int SymbolMaxLength = 32;
    public const int NameMaxLength = 200;
    public const int ExchangeMaxLength = 32;
    public const int PriceSymbolMaxLength = 32;
    public const int PriceSyncErrorMaxLength = 200;
    public const int PriceQuoteCurrencyLength = 3;

    public SecurityId Id { get; set; } = SecurityId.New();
    public string Symbol { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Isin { get; set; }
    public string? Exchange { get; set; }
    public SecurityType Type { get; set; }
    public Currency Currency { get; set; }
    public long? BrokerContractId { get; set; }
    public decimal? LastPrice { get; set; }
    public DateOnly? LastPriceDate { get; set; }
    public PriceSource PriceSource { get; set; }
    public string? PriceSymbol { get; set; }
    public string? PriceQuoteCurrency { get; set; }
    public DateTimeOffset? PriceSyncedAt { get; set; }
    public string? PriceSyncError { get; set; }
}
