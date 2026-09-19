namespace JxFinance.Domain.Investments;

public sealed record RealizedSale(DateOnly Date, decimal Gain, decimal ReportingGain);

public sealed class Position(SecurityId securityId)
{
    private readonly LinkedList<Lot> lots = new();
    private readonly List<RealizedSale> sales = [];

    public SecurityId SecurityId { get; } = securityId;

    public decimal Quantity => lots.Sum(l => l.Quantity);

    public decimal CostBasis => lots.Sum(l => l.Quantity * l.UnitCost);

    public bool IsOversold { get; private set; }

    public IReadOnlyList<RealizedSale> Sales => sales;

    public void Buy(decimal quantity, decimal cost, decimal reportingCost)
    {
        if (quantity > 0)
        {
            lots.AddLast(new Lot(quantity, cost / quantity, reportingCost / quantity));
        }
    }

    public void Sell(DateOnly date, decimal quantity, decimal proceeds, decimal reportingProceeds)
    {
        var remaining = quantity;
        var (cost, reportingCost) = (0m, 0m);
        while (remaining > 0 && lots.First is { } first)
        {
            var lot = first.Value;
            var taken = Math.Min(lot.Quantity, remaining);
            cost += taken * lot.UnitCost;
            reportingCost += taken * lot.ReportingUnitCost;
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
        sales.Add(new RealizedSale(date, proceeds - cost, reportingProceeds - reportingCost));
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
            node.Value = new Lot(lot.Quantity * ratio, lot.UnitCost / ratio, lot.ReportingUnitCost / ratio);
        }
    }

    private sealed record Lot(decimal Quantity, decimal UnitCost, decimal ReportingUnitCost);
}
