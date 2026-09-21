using JxFinance.Domain.Common;
using JxFinance.Domain.ExchangeRates;

namespace JxFinance.Domain.Investments;

public sealed record ConsumedLot(
    DateOnly AcquiredOn,
    decimal Quantity,
    decimal Cost,
    decimal ReportingCost);

public sealed record RealizedSale(
    InvestmentTransactionId Id,
    DateOnly Date,
    decimal Quantity,
    decimal Proceeds,
    decimal ReportingProceeds,
    decimal Cost,
    decimal ReportingCost,
    IReadOnlyList<ConsumedLot> Lots)
{
    public decimal Gain => Proceeds - Cost;

    public decimal ReportingGain => ReportingProceeds - ReportingCost;
}

public readonly record struct PositionValue(decimal? Market, decimal? Reporting, bool IsComplete);

public sealed class Position(SecurityId securityId)
{
    private readonly LinkedList<Lot> lots = new();
    private readonly List<RealizedSale> sales = [];

    public SecurityId SecurityId { get; } = securityId;

    public decimal Quantity => lots.Sum(l => l.Quantity);

    public decimal CostBasis => lots.Sum(l => l.Quantity * l.UnitCost);

    public decimal ReportingCostBasis => lots.Sum(l => l.Quantity * l.ReportingUnitCost);

    public bool IsOversold { get; private set; }

    public IReadOnlyList<RealizedSale> Sales => sales;

    public PositionValue Value(decimal? lastPrice, Currency currency, RateTable rates, Currency reportingCurrency)
    {
        var market = lastPrice is { } price ? Quantity * price : (decimal?)null;
        var reporting = market is { } known ? rates.Convert(known, currency, reportingCurrency) : null;
        return new PositionValue(market, reporting, reporting is not null && !IsOversold);
    }

    public void Buy(DateOnly date, decimal quantity, decimal cost, decimal reportingCost)
    {
        if (quantity > 0)
        {
            lots.AddLast(new Lot(date, quantity, cost / quantity, reportingCost / quantity));
        }
    }

    public void Sell(
        InvestmentTransactionId id,
        DateOnly date,
        decimal quantity,
        decimal proceeds,
        decimal reportingProceeds)
    {
        var remaining = quantity;
        var (cost, reportingCost) = (0m, 0m);
        var consumed = new List<ConsumedLot>();
        while (remaining > 0 && lots.First is { } first)
        {
            var lot = first.Value;
            var taken = Math.Min(lot.Quantity, remaining);
            var takenCost = taken * lot.UnitCost;
            var takenReportingCost = taken * lot.ReportingUnitCost;
            consumed.Add(new ConsumedLot(lot.AcquiredOn, taken, takenCost, takenReportingCost));
            cost += takenCost;
            reportingCost += takenReportingCost;
            remaining -= taken;
            if (taken == lot.Quantity)
            {
                lots.RemoveFirst();
            }
            else
            {
                first.Value = lot with { Quantity = lot.Quantity - taken };
            }
        }

        IsOversold |= remaining > 0;
        sales.Add(new RealizedSale(id, date, quantity, proceeds, reportingProceeds, cost, reportingCost, consumed));
    }

    public void Split(decimal ratio)
    {
        if (ratio <= 0)
        {
            return;
        }

        for (var node = lots.First; node is not null; node = node.Next)
        {
            var lot = node.Value;
            node.Value = lot with
            {
                Quantity = lot.Quantity * ratio,
                UnitCost = lot.UnitCost / ratio,
                ReportingUnitCost = lot.ReportingUnitCost / ratio,
            };
        }
    }

    private sealed record Lot(DateOnly AcquiredOn, decimal Quantity, decimal UnitCost, decimal ReportingUnitCost);
}
