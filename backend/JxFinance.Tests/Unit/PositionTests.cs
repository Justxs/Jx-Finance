using JxFinance.Domain.Investments;

namespace JxFinance.Tests.Unit;

public sealed class PositionTests
{
    private static readonly DateOnly Bought = new(2026, 6, 1);
    private static readonly DateOnly Sold = new(2026, 6, 2);

    [Theory]
    [InlineData(100, 90)]
    [InlineData(1, 2)]
    public void Selling_a_whole_lot_takes_exactly_what_it_cost(int cost, int reportingCost)
    {
        var position = new Position(SecurityId.New());
        position.Buy(Bought, 3m, cost, reportingCost);

        position.Sell(InvestmentTransactionId.New(), Sold, 3m, 120m, 108m);

        var sale = Assert.Single(position.Sales);
        Assert.Equal(((decimal)cost, (decimal)reportingCost), (sale.Cost, sale.ReportingCost));
        Assert.Equal((0m, 0m), (position.CostBasis, position.ReportingCostBasis));
    }

    [Fact]
    public void Partial_sales_of_a_lot_add_up_to_exactly_what_it_cost()
    {
        var position = new Position(SecurityId.New());
        position.Buy(Bought, 3m, 1m, 2m);

        for (var i = 0; i < 3; i++)
        {
            position.Sell(InvestmentTransactionId.New(), Sold, 1m, 0.40m, 0.80m);
        }

        Assert.Equal(1m, position.Sales.Sum(s => s.Cost));
        Assert.Equal(2m, position.Sales.Sum(s => s.ReportingCost));
        Assert.Equal((0m, 0m), (position.CostBasis, position.ReportingCostBasis));
    }

    [Fact]
    public void The_cost_still_held_after_a_partial_sale_is_the_exact_remainder()
    {
        var position = new Position(SecurityId.New());
        position.Buy(Bought, 3m, 1m, 2m);

        position.Sell(InvestmentTransactionId.New(), Sold, 1m, 0.40m, 0.80m);

        Assert.Equal(2m, position.Quantity);
        Assert.Equal(1m, position.CostBasis + Assert.Single(position.Sales).Cost);
        Assert.Equal(2m, position.ReportingCostBasis + position.Sales[0].ReportingCost);
    }

    [Fact]
    public void A_split_changes_the_quantity_and_keeps_the_cost()
    {
        var position = new Position(SecurityId.New());
        position.Buy(Bought, 3m, 1m, 2m);

        position.Split(3m);

        Assert.Equal(9m, position.Quantity);
        Assert.Equal((1m, 2m), (position.CostBasis, position.ReportingCostBasis));

        position.Sell(InvestmentTransactionId.New(), Sold, 9m, 1.20m, 2.40m);

        var sale = Assert.Single(position.Sales);
        Assert.Equal((1m, 2m), (sale.Cost, sale.ReportingCost));
        Assert.Equal(9m, Assert.Single(sale.Lots).Quantity);
    }

    [Fact]
    public void A_reverse_split_that_leaves_a_repeating_quantity_still_sells_for_the_full_cost()
    {
        var position = new Position(SecurityId.New());
        position.Buy(Bought, 10m, 1m, 2m);

        position.Split(1m / 3m);
        position.Sell(InvestmentTransactionId.New(), Sold, position.Quantity, 1.20m, 2.40m);

        var sale = Assert.Single(position.Sales);
        Assert.Equal((1m, 2m), (sale.Cost, sale.ReportingCost));
        Assert.Equal(0m, position.Quantity);
    }
}
