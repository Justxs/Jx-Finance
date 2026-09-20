namespace JxFinance.Endpoints.Investments.Shared;

public sealed record BrokerImportResponse(
    int Trades,
    int CashEntries,
    int Conversions,
    int Transfers,
    int Duplicates,
    int Skipped,
    int SecuritiesCreated,
    int PricesUpdated,
    int Splits,
    IReadOnlyList<SkippedCorporateActionResponse> SkippedCorporateActions,
    IReadOnlyList<PositionMismatchResponse>? PositionMismatches);
