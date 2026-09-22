namespace JxFinance.Domain.Investments;

public static class Portfolio
{
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
                InvestmentTransactionType.Sell => 2,
                _ => 1,
            })
            .ThenBy(t => t.CreatedAt);

    public static void Apply(Dictionary<SecurityId, Position> positions, InvestmentTransaction transaction)
    {
        if (transaction.SecurityId is not { } securityId)
        {
            return;
        }

        if (!positions.TryGetValue(securityId, out var position))
        {
            position = positions[securityId] = new Position(securityId);
        }

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
            default:
                break;
        }
    }

    public static decimal CashEffect(InvestmentTransactionType type, decimal quantity, decimal price, decimal amount, decimal fee) =>
        type switch
        {
            InvestmentTransactionType.Buy => -((quantity * price) + fee),
            InvestmentTransactionType.Sell => (quantity * price) - fee,
            InvestmentTransactionType.Dividend or InvestmentTransactionType.Interest => amount,
            InvestmentTransactionType.WithholdingTax or InvestmentTransactionType.Fee => -amount,
            _ => 0m,
        };
}
