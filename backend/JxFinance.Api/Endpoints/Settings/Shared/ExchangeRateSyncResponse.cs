namespace JxFinance.Endpoints.Settings.Shared;

public sealed record ExchangeRateSyncResponse(int Added, DateOnly? RatesAsOf);
