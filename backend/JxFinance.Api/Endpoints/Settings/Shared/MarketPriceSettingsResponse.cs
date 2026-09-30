namespace JxFinance.Endpoints.Settings.Shared;

public sealed record MarketPriceSettingsResponse(
    bool Enabled,
    bool HasKey,
    DateTimeOffset? LastRunAt,
    int CallsLeft,
    IReadOnlyList<PriceSyncFailure> Failures);

public sealed record PriceSyncFailure(Guid SecurityId, string Symbol, string Name, string Reason, DateTimeOffset At);
