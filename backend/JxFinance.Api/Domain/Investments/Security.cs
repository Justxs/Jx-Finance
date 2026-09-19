using JxFinance.Domain.Common;

namespace JxFinance.Domain.Investments;

public sealed class Security : EntityBase
{
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
}
