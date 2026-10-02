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

    public IReadOnlyCollection<Lot> Lots => lots;

    public decimal Quantity => lots.Sum(l => l.Quantity);

    public decimal CostBasis => lots.Sum(l => l.Cost);

    public decimal ReportingCostBasis => lots.Sum(l => l.ReportingCost);

    public bool IsOversold => FirstOversoldSale is not null;

    public InvestmentTransactionId? FirstOversoldSale { get; private set; }

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
            lots.AddLast(new Lot(date, quantity, cost, reportingCost));
        }
    }

    public void Sell(
        InvestmentTransactionId id,
        DateOnly date,
        decimal quantity,
        decimal proceeds,
        decimal reportingProceeds)
    {
        var consumed = Take(id, quantity);
        sales.Add(new RealizedSale(
            id,
            date,
            quantity,
            proceeds,
            reportingProceeds,
            consumed.Sum(l => l.Cost),
            consumed.Sum(l => l.ReportingCost),
            consumed));
    }

    public IReadOnlyList<ConsumedLot> Take(InvestmentTransactionId id, decimal quantity)
    {
        var remaining = quantity;
        var consumed = new List<ConsumedLot>();
        while (remaining > 0 && lots.First is { } first)
        {
            var lot = first.Value;
            var taken = Math.Min(lot.Quantity, remaining);
            var isWhole = taken == lot.Quantity;
            var takenCost = isWhole ? lot.Cost : lot.Cost * taken / lot.Quantity;
            var takenReportingCost = isWhole ? lot.ReportingCost : lot.ReportingCost * taken / lot.Quantity;
            consumed.Add(new ConsumedLot(lot.AcquiredOn, taken, takenCost, takenReportingCost));
            remaining -= taken;
            if (isWhole)
            {
                lots.RemoveFirst();
            }
            else
            {
                first.Value = new Lot(
                    lot.AcquiredOn,
                    lot.Quantity - taken,
                    lot.Cost - takenCost,
                    lot.ReportingCost - takenReportingCost);
            }
        }

        if (remaining > 0)
        {
            FirstOversoldSale ??= id;
        }

        return consumed;
    }

    public void Receive(IEnumerable<ConsumedLot> taken, decimal ratio)
    {
        foreach (var lot in taken)
        {
            var received = new Lot(lot.AcquiredOn, lot.Quantity * ratio, lot.Cost, lot.ReportingCost);
            var later = lots.First;
            while (later is not null && later.Value.AcquiredOn <= received.AcquiredOn)
            {
                later = later.Next;
            }

            if (later is null)
            {
                lots.AddLast(received);
            }
            else
            {
                lots.AddBefore(later, received);
            }
        }
    }

    public void Split(decimal ratio)
    {
        if (ratio <= 0)
        {
            return;
        }

        for (var node = lots.First; node is not null; node = node.Next)
        {
            node.Value = node.Value with { Quantity = node.Value.Quantity * ratio };
        }
    }

    public sealed record Lot(DateOnly AcquiredOn, decimal Quantity, decimal Cost, decimal ReportingCost);
}
