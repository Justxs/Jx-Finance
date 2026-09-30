namespace JxFinance.Infrastructure.MarketPrices;

public sealed record MarketClose(DateOnly Date, decimal Close, string Currency);
