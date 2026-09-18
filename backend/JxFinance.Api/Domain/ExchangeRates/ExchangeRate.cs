using JxFinance.Domain.Common;

namespace JxFinance.Domain.ExchangeRates;

public sealed class ExchangeRate
{
    public DateOnly Date { get; set; }
    public Currency Currency { get; set; }
    public decimal Rate { get; set; }
}
