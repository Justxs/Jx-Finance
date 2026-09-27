namespace JxFinance.Domain.NetWorth;

public sealed record Depreciation(DateOnly StartDate, decimal StartValue, int LifeMonths, decimal ResidualValue)
{
    public const int MaxLifeMonths = 600;
}
