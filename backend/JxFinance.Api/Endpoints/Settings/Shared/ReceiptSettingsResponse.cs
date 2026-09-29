namespace JxFinance.Endpoints.Settings.Shared;

public sealed record ReceiptSettingsResponse(
    bool Enabled,
    bool HasKey,
    string Model,
    int MonthlyLimit,
    int ReadingsThisMonth);
