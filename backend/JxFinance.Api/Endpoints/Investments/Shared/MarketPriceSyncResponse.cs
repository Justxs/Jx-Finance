namespace JxFinance.Endpoints.Investments.Shared;

public sealed record MarketPriceSyncResponse(int Checked, int Written, int Failed, int CallsLeft);
