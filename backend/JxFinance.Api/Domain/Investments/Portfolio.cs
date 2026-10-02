namespace JxFinance.Domain.Investments;

public static class Portfolio
{
    public const decimal WholeCost = 100m;

    public static readonly InvestmentTransactionType[] PositionTypes =
    [
        InvestmentTransactionType.Buy,
        InvestmentTransactionType.Sell,
        InvestmentTransactionType.Split,
        InvestmentTransactionType.SymbolChange,
        InvestmentTransactionType.Merger,
    ];

    public static readonly InvestmentTransactionType[] CorporateActionTypes =
    [
        InvestmentTransactionType.SymbolChange,
        InvestmentTransactionType.Merger,
    ];

    public static IReadOnlyDictionary<SecurityId, Position> Positions(IEnumerable<InvestmentTransaction> transactions)
    {
        var positions = new Dictionary<SecurityId, Position>();
        foreach (var transaction in InOrder(transactions))
        {
            Apply(positions, transaction);
        }

        return positions;
    }

    public static IOrderedEnumerable<InvestmentTransaction> InOrder(IEnumerable<InvestmentTransaction> transactions) =>
        transactions
            .OrderBy(t => t.Date)
            .ThenBy(t => t.Type switch
            {
                InvestmentTransactionType.Split => 0,
                _ when CorporateActionTypes.Contains(t.Type) => 0,
                InvestmentTransactionType.Sell => 2,
                _ => 1,
            })
            .ThenBy(t => t.CreatedAt);

    public static IEnumerable<SecurityId> SecuritiesOf(InvestmentTransaction transaction) =>
        new[] { transaction.SecurityId, transaction.RelatedSecurityId }.OfType<SecurityId>();

    public static void Apply(Dictionary<SecurityId, Position> positions, InvestmentTransaction transaction)
    {
        if (transaction.SecurityId is not { } securityId)
        {
            return;
        }

        var position = Book(positions, securityId);
        switch (transaction.Type)
        {
            case InvestmentTransactionType.Buy:
                position.Buy(
                    transaction.Date,
                    transaction.Quantity,
                    -transaction.CashAmount.Amount,
                    -transaction.ReportingAmount);
                break;
            case InvestmentTransactionType.Sell:
                position.Sell(
                    transaction.Id,
                    transaction.Date,
                    transaction.Quantity,
                    transaction.CashAmount.Amount,
                    transaction.ReportingAmount);
                break;
            case InvestmentTransactionType.Split:
                position.Split(transaction.Quantity);
                break;
            case InvestmentTransactionType.SymbolChange when transaction.RelatedSecurityId is { } successor:
                Book(positions, successor).Receive(position.Take(transaction.Id, transaction.Quantity), 1m);
                break;
            case InvestmentTransactionType.Merger:
                Merge(positions, position, transaction);
                break;
            default:
                break;
        }
    }

    public static bool TakesCostShare(InvestmentTransaction transaction) =>
        transaction.Type == InvestmentTransactionType.Merger
        && transaction.RelatedSecurityId is not null
        && transaction.CashAmount.Amount != 0m;

    public static decimal CarriedShare(InvestmentTransaction transaction) =>
        transaction.RelatedSecurityId is null ? 0m : (transaction.CostShare ?? WholeCost) / WholeCost;

    public static decimal CashEffect(InvestmentTransactionType type, decimal quantity, decimal price, decimal amount, decimal fee) =>
        type switch
        {
            InvestmentTransactionType.Buy => -((quantity * price) + fee),
            InvestmentTransactionType.Sell => (quantity * price) - fee,
            InvestmentTransactionType.Dividend or InvestmentTransactionType.Interest or InvestmentTransactionType.Merger => amount,
            InvestmentTransactionType.WithholdingTax or InvestmentTransactionType.Fee => -amount,
            _ => 0m,
        };

    private static Position Book(Dictionary<SecurityId, Position> positions, SecurityId securityId) =>
        positions.TryGetValue(securityId, out var position) ? position : positions[securityId] = new Position(securityId);

    private static void Merge(Dictionary<SecurityId, Position> positions, Position target, InvestmentTransaction merger)
    {
        var taken = target.Take(merger.Id, merger.Quantity);
        var carried = CarriedShare(merger);
        var kept = taken
            .Select(lot => lot with { Cost = lot.Cost * carried, ReportingCost = lot.ReportingCost * carried })
            .ToList();
        if (merger.RelatedSecurityId is { } acquirer && merger.Quantity > 0m)
        {
            Book(positions, acquirer).Receive(kept, merger.RelatedQuantity / merger.Quantity);
        }

        if (merger.RelatedSecurityId is null || merger.CashAmount.Amount != 0m)
        {
            var paid = taken
                .Zip(kept, (lot, moved) => new ConsumedLot(
                    lot.AcquiredOn,
                    lot.Quantity * (1m - carried),
                    lot.Cost - moved.Cost,
                    lot.ReportingCost - moved.ReportingCost))
                .ToList();
            target.Realize(
                merger.Id,
                merger.Date,
                merger.Quantity * (1m - carried),
                paid,
                merger.CashAmount.Amount,
                merger.ReportingAmount);
        }
    }
}
