using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Investments.Shared;

public sealed record HoldingResponse(
    Guid AccountId,
    SecurityResponse Security,
    [property: Quantity] decimal Quantity,
    [property: Quantity] decimal AverageCost,
    [property: Money] decimal CostBasis,
    [property: Money] decimal? MarketValue,
    [property: Money] decimal? UnrealizedGain,
    [property: Quantity] decimal? UnrealizedPercent,
    [property: Money] decimal? MarketValueReporting,
    [property: Money] decimal RealizedGain,
    [property: Money] decimal Dividends);

public sealed record PortfolioYear(
    int Year,
    [property: Money] decimal Dividends,
    [property: Money] decimal WithholdingTax,
    [property: Money] decimal Interest,
    [property: Money] decimal Fees,
    [property: Money] decimal RealizedGain);

public sealed record PortfolioResponse(
    Currency ReportingCurrency,
    [property: Money] decimal MarketValue,
    [property: Money] decimal CostBasis,
    [property: Money] decimal UnrealizedGain,
    [property: Money] decimal RealizedGain,
    [property: Money] decimal Dividends,
    [property: Money] decimal WithholdingTax,
    [property: Money] decimal Fees,
    bool IsComplete,
    IReadOnlyList<HoldingResponse> Holdings,
    IReadOnlyList<PortfolioYear> Years);
