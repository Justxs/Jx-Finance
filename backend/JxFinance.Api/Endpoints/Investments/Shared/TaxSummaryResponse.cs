using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.Shared;

public sealed record TaxSummaryAccount(Guid Id, string Name);

public sealed record TaxLotResponse(
    DateOnly AcquiredOn,
    [property: Quantity] decimal Quantity,
    [property: Money] decimal Cost,
    [property: Money] decimal ReportingCost);

public sealed record TaxDisposalResponse(
    Guid Id,
    DateOnly Date,
    Guid AccountId,
    Guid SecurityId,
    string Symbol,
    string Name,
    Currency Currency,
    [property: Quantity] decimal Quantity,
    [property: Money] decimal Proceeds,
    [property: Money] decimal CostBasis,
    [property: Money] decimal Gain,
    [property: Money] decimal ReportingProceeds,
    [property: Money] decimal ReportingCostBasis,
    [property: Money] decimal ReportingGain,
    IReadOnlyList<TaxLotResponse> Lots);

public sealed record TaxCashEntryResponse(
    Guid Id,
    DateOnly Date,
    Guid AccountId,
    InvestmentTransactionType Type,
    string? Symbol,
    string? Description,
    Currency Currency,
    [property: Money] decimal Amount,
    [property: Money] decimal ReportingAmount);

public sealed record TaxSummaryTotals(
    [property: Money] decimal Proceeds,
    [property: Money] decimal CostBasis,
    [property: Money] decimal Gains,
    [property: Money] decimal Losses,
    [property: Money] decimal RealizedGain,
    [property: Money] decimal Dividends,
    [property: Money] decimal Interest,
    [property: Money] decimal WithholdingTax,
    [property: Money] decimal Fees);

public sealed record TaxSummaryResponse(
    int Year,
    Currency ReportingCurrency,
    IReadOnlyList<int> AvailableYears,
    IReadOnlyList<TaxSummaryAccount> Accounts,
    TaxSummaryTotals Totals,
    IReadOnlyList<TaxDisposalResponse> Disposals,
    IReadOnlyList<TaxCashEntryResponse> CashEntries,
    bool IsComplete);
