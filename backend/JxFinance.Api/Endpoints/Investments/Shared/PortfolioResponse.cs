using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Investments.Shared;

public sealed record HoldingResponse(
    Guid AccountId,
    SecurityResponse Security,
    string Quantity,
    string AverageCost,
    string CostBasis,
    string? MarketValue,
    string? UnrealizedGain,
    string? UnrealizedPercent,
    string? MarketValueReporting,
    string RealizedGain,
    string Dividends);

public sealed record PortfolioYear(
    int Year,
    string Dividends,
    string WithholdingTax,
    string Interest,
    string Fees,
    string RealizedGain);

public sealed record PortfolioResponse(
    Currency ReportingCurrency,
    string MarketValue,
    string CostBasis,
    string UnrealizedGain,
    string RealizedGain,
    string Dividends,
    string WithholdingTax,
    string Fees,
    bool IsComplete,
    IReadOnlyList<HoldingResponse> Holdings,
    IReadOnlyList<PortfolioYear> Years);
