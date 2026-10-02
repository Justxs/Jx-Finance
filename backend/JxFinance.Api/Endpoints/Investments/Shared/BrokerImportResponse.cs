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
    int CorporateActions,
    IReadOnlyList<SkippedCorporateActionResponse> SkippedCorporateActions,
    IReadOnlyList<PositionMismatchResponse>? PositionMismatches)
{
    public IReadOnlyList<string> CostSharesMissing { get; init; } = [];
}
