using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Tests.Unit;

public sealed class PortfolioTests
{
    private static readonly SecurityId Fund = SecurityId.New();
    private static readonly SecurityId Successor = SecurityId.New();

    private static InvestmentTransaction Entry(
        InvestmentTransactionType type,
        int day,
        decimal quantity,
        decimal price,
        decimal fee = 0m) => new()
        {
            SecurityId = Fund,
            Type = type,
            Date = new DateOnly(2026, 6, day),
            CreatedAt = new DateTimeOffset(2026, 6, day, 0, 0, 0, TimeSpan.Zero),
            Quantity = quantity,
            Price = price,
            Fee = fee,
            CashAmount = new Money(Portfolio.CashEffect(type, quantity, price, 0m, fee), Currency.Eur),
            ReportingAmount = Portfolio.CashEffect(type, quantity, price, 0m, fee),
        };

    [Fact]
    public void Sells_consume_the_oldest_lots_first()
    {
        var position = Portfolio.Positions(
        [
            Entry(InvestmentTransactionType.Buy, 1, 10m, 100m),
            Entry(InvestmentTransactionType.Buy, 2, 10m, 120m),
            Entry(InvestmentTransactionType.Sell, 3, 15m, 130m),
        ])[Fund];

        Assert.Equal(5m, position.Quantity);
        Assert.Equal(600m, position.CostBasis);
        Assert.Equal(350m, Assert.Single(position.Sales).Gain);
    }

    [Fact]
    public void Same_day_buys_are_replayed_before_sells()
    {
        var position = Portfolio.Positions(
        [
            Entry(InvestmentTransactionType.Sell, 1, 10m, 110m),
            Entry(InvestmentTransactionType.Buy, 1, 10m, 100m),
        ])[Fund];

        Assert.False(position.IsOversold);
        Assert.Equal(100m, Assert.Single(position.Sales).Gain);
    }

    [Fact]
    public void Selling_without_lots_is_flagged()
    {
        var position = Portfolio.Positions([Entry(InvestmentTransactionType.Sell, 1, 1m, 10m)])[Fund];

        Assert.True(position.IsOversold);
    }

    [Fact]
    public void The_first_sale_that_sells_more_than_was_held_is_named()
    {
        var covered = Entry(InvestmentTransactionType.Sell, 2, 6m, 10m);
        var uncovered = Entry(InvestmentTransactionType.Sell, 3, 6m, 10m);
        var later = Entry(InvestmentTransactionType.Sell, 4, 1m, 10m);

        var position = Portfolio.Positions(
        [
            later,
            Entry(InvestmentTransactionType.Buy, 1, 10m, 100m),
            uncovered,
            covered,
        ])[Fund];

        Assert.Equal(uncovered.Id, position.FirstOversoldSale);
    }

    [Fact]
    public void Fees_raise_cost_and_lower_proceeds()
    {
        var position = Portfolio.Positions(
        [
            Entry(InvestmentTransactionType.Buy, 1, 10m, 100m, 5m),
            Entry(InvestmentTransactionType.Sell, 2, 10m, 100m, 5m),
        ])[Fund];

        Assert.Equal(0m, position.Quantity);
        Assert.Equal(-10m, Assert.Single(position.Sales).Gain);
    }

    [Fact]
    public void Split_multiplies_shares_and_keeps_cost()
    {
        var position = Portfolio.Positions(
        [
            Entry(InvestmentTransactionType.Buy, 1, 10m, 100m),
            Entry(InvestmentTransactionType.Split, 2, 4m, 0m),
        ])[Fund];

        Assert.Equal(40m, position.Quantity);
        Assert.Equal(1000m, position.CostBasis);
    }

    [Fact]
    public void A_split_is_replayed_before_the_trades_of_its_own_day()
    {
        var position = Portfolio.Positions(
        [
            Entry(InvestmentTransactionType.Buy, 1, 10m, 100m),
            Entry(InvestmentTransactionType.Sell, 2, 4m, 60m),
            Entry(InvestmentTransactionType.Buy, 2, 5m, 50m),
            Entry(InvestmentTransactionType.Split, 2, 2m, 0m),
        ])[Fund];

        Assert.Equal(21m, position.Quantity);
        Assert.Equal(1050m, position.CostBasis);
        Assert.Equal(40m, Assert.Single(position.Sales).Gain);
    }

    [Fact]
    public void Sale_after_a_split_uses_the_diluted_cost_per_share()
    {
        var position = Portfolio.Positions(
        [
            Entry(InvestmentTransactionType.Buy, 1, 10m, 100m),
            Entry(InvestmentTransactionType.Split, 2, 4m, 0m),
            Entry(InvestmentTransactionType.Sell, 3, 10m, 30m),
        ])[Fund];

        Assert.Equal(30m, position.Quantity);
        Assert.Equal(750m, position.CostBasis);
        Assert.Equal(50m, Assert.Single(position.Sales).Gain);
    }

    [Fact]
    public void Sale_spanning_two_lots_books_one_gain_from_both()
    {
        var position = Portfolio.Positions(
        [
            Entry(InvestmentTransactionType.Buy, 1, 1m, 100m),
            Entry(InvestmentTransactionType.Buy, 2, 1m, 200m),
            Entry(InvestmentTransactionType.Sell, 3, 2m, 250m),
        ])[Fund];

        Assert.Equal(0m, position.Quantity);
        Assert.Equal(0m, position.CostBasis);
        Assert.Equal(200m, position.Sales.Sum(s => s.Gain));
    }

    [Fact]
    public void Applying_the_entries_day_by_day_ends_where_a_full_replay_does()
    {
        List<InvestmentTransaction> entries =
        [
            Entry(InvestmentTransactionType.Buy, 1, 10m, 100m),
            Entry(InvestmentTransactionType.Sell, 2, 4m, 60m),
            Entry(InvestmentTransactionType.Buy, 2, 5m, 50m),
            Entry(InvestmentTransactionType.Split, 2, 2m, 0m),
            Entry(InvestmentTransactionType.Sell, 5, 3m, 70m),
            Entry(InvestmentTransactionType.Dividend, 5, 0m, 0m),
        ];

        var ordered = Portfolio.InOrder(entries).ToList();
        for (var day = 1; day <= 6; day++)
        {
            var until = new DateOnly(2026, 6, day);
            var walked = new Dictionary<SecurityId, Position>();
            foreach (var entry in ordered.TakeWhile(e => e.Date <= until))
            {
                Portfolio.Apply(walked, entry);
            }

            var replayed = Portfolio.Positions(entries.Where(e => e.Date <= until));

            Assert.Equal(replayed.Count, walked.Count);
            if (replayed.TryGetValue(Fund, out var expected))
            {
                Assert.Equal(expected.Quantity, walked[Fund].Quantity);
                Assert.Equal(expected.CostBasis, walked[Fund].CostBasis);
                Assert.Equal(expected.IsOversold, walked[Fund].IsOversold);
                Assert.Equal(expected.Sales.Sum(s => s.Gain), walked[Fund].Sales.Sum(s => s.Gain));
            }
        }
    }

    [Fact]
    public void Walking_the_entries_once_gives_every_prefix_in_turn()
    {
        List<InvestmentTransaction> entries =
        [
            Entry(InvestmentTransactionType.Buy, 1, 10m, 100m),
            Entry(InvestmentTransactionType.Buy, 3, 10m, 120m),
            Entry(InvestmentTransactionType.Sell, 5, 15m, 130m),
        ];

        var ordered = Portfolio.InOrder(entries).ToList();
        var book = new Dictionary<SecurityId, Position>();
        var next = 0;
        var quantities = new List<decimal>();
        foreach (var day in new[] { 2, 4, 6 })
        {
            var until = new DateOnly(2026, 6, day);
            while (next < ordered.Count && ordered[next].Date <= until)
            {
                Portfolio.Apply(book, ordered[next++]);
            }

            quantities.Add(book[Fund].Quantity);
        }

        Assert.Equal([10m, 20m, 5m], quantities);
    }

    [Fact]
    public void A_partial_symbol_change_moves_the_oldest_lots_with_their_cost_and_dates()
    {
        var positions = Portfolio.Positions(
        [
            Entry(InvestmentTransactionType.Buy, 1, 10m, 100m),
            Entry(InvestmentTransactionType.Buy, 2, 10m, 120m),
            Action(InvestmentTransactionType.SymbolChange, 3, Fund, 15m, Successor),
        ]);

        Assert.Equal((5m, 600m), (positions[Fund].Quantity, positions[Fund].CostBasis));
        Assert.Equal(
            [(new DateOnly(2026, 6, 1), 10m, 1000m), (new DateOnly(2026, 6, 2), 5m, 600m)],
            positions[Successor].Lots.Select(l => (l.AcquiredOn, l.Quantity, l.Cost)));
        Assert.Empty(positions[Fund].Sales);
    }

    [Fact]
    public void A_whole_symbol_change_slots_the_lots_among_the_ones_the_new_security_holds()
    {
        var heldAlready = Entry(InvestmentTransactionType.Buy, 2, 5m, 50m);
        heldAlready.SecurityId = Successor;
        var soldAfter = Entry(InvestmentTransactionType.Sell, 5, 10m, 130m);
        soldAfter.SecurityId = Successor;

        var positions = Portfolio.Positions(
        [
            Entry(InvestmentTransactionType.Buy, 1, 10m, 100m),
            Entry(InvestmentTransactionType.Buy, 3, 10m, 120m),
            heldAlready,
            Action(InvestmentTransactionType.SymbolChange, 4, Fund, 20m, Successor),
            soldAfter,
        ]);

        Assert.Equal(0m, positions[Fund].Quantity);
        Assert.Equal([2, 3], positions[Successor].Lots.Select(l => l.AcquiredOn.Day));
        var sale = Assert.Single(positions[Successor].Sales);
        Assert.Equal((new DateOnly(2026, 6, 1), 1000m), (Assert.Single(sale.Lots).AcquiredOn, sale.Cost));
    }

    [Fact]
    public void Moving_more_shares_than_are_held_marks_the_symbol_change_oversold()
    {
        var change = Action(InvestmentTransactionType.SymbolChange, 2, Fund, 30m, Successor);

        var positions = Portfolio.Positions([Entry(InvestmentTransactionType.Buy, 1, 20m, 10m), change]);

        Assert.Equal(change.Id, positions[Fund].FirstOversoldSale);
        Assert.Equal(20m, positions[Successor].Quantity);
    }

    [Fact]
    public void A_cash_merger_is_a_disposal_at_the_cash_received()
    {
        var merger = Action(InvestmentTransactionType.Merger, 2, Fund, 10m, null, cash: 1500m);

        var position = Portfolio.Positions([Entry(InvestmentTransactionType.Buy, 1, 10m, 100m), merger])[Fund];

        Assert.Equal(0m, position.Quantity);
        var sale = Assert.Single(position.Sales);
        Assert.Equal((merger.Id, 10m, 1500m, 1000m, 500m), (sale.Id, sale.Quantity, sale.Proceeds, sale.Cost, sale.Gain));
    }

    [Fact]
    public void A_stock_merger_carries_the_whole_cost_into_the_acquirer_at_the_ratio()
    {
        var positions = Portfolio.Positions(
        [
            Entry(InvestmentTransactionType.Buy, 1, 10m, 100m),
            Action(InvestmentTransactionType.Merger, 2, Fund, 10m, Successor, received: 4m),
        ]);

        Assert.Equal(0m, positions[Fund].Quantity);
        Assert.Empty(positions[Fund].Sales);
        Assert.Equal((4m, 1000m, new DateOnly(2026, 6, 1)), (positions[Successor].Quantity, positions[Successor].CostBasis, positions[Successor].Lots.Single().AcquiredOn));
    }

    [Theory]
    [InlineData(80d, 800d, 2d, 200d, 100d)]
    [InlineData(null, 1000d, 0d, 0d, 300d)]
    public void A_mixed_merger_divides_the_cost_by_its_share_and_counts_100_percent_while_it_is_not_set(
        double? costShare,
        double carriedCost,
        double disposedQuantity,
        double disposedCost,
        double gain)
    {
        var merger = Action(InvestmentTransactionType.Merger, 2, Fund, 10m, Successor, received: 4m, cash: 300m, costShare: (decimal?)costShare);

        var positions = Portfolio.Positions([Entry(InvestmentTransactionType.Buy, 1, 10m, 100m), merger]);

        Assert.Equal((4m, (decimal)carriedCost), (positions[Successor].Quantity, positions[Successor].CostBasis));
        var sale = Assert.Single(positions[Fund].Sales);
        Assert.Equal(((decimal)disposedQuantity, (decimal)disposedCost, 300m, (decimal)gain), (sale.Quantity, sale.Cost, sale.Proceeds, sale.Gain));
    }

    [Theory]
    [InlineData(25d, 150d, 450d)]
    [InlineData(null, 0d, 600d)]
    public void A_spin_off_carves_its_cost_share_out_of_every_lot_and_counts_0_percent_while_it_is_not_set(
        double? costShare,
        double childLotCost,
        double parentLotCost)
    {
        var positions = Portfolio.Positions(
        [
            Entry(InvestmentTransactionType.Buy, 1, 6m, 100m),
            Entry(InvestmentTransactionType.Buy, 2, 4m, 150m),
            Action(InvestmentTransactionType.SpinOff, 3, Fund, 0m, Successor, received: 5m, costShare: (decimal?)costShare),
        ]);

        Assert.Equal(10m, positions[Fund].Quantity);
        Assert.All(positions[Fund].Lots, lot => Assert.Equal((decimal)parentLotCost, lot.Cost));
        Assert.Equal(
            [(new DateOnly(2026, 6, 1), 3m, (decimal)childLotCost), (new DateOnly(2026, 6, 2), 2m, (decimal)childLotCost)],
            positions[Successor].Lots.Select(l => (l.AcquiredOn, l.Quantity, l.Cost)));
    }

    [Fact]
    public void A_spin_off_from_an_empty_parent_books_the_new_shares_at_no_cost_on_its_date()
    {
        var positions = Portfolio.Positions([Action(InvestmentTransactionType.SpinOff, 3, Fund, 0m, Successor, received: 5m, costShare: 25m)]);

        var lot = Assert.Single(positions[Successor].Lots);
        Assert.Equal((new DateOnly(2026, 6, 3), 5m, 0m), (lot.AcquiredOn, lot.Quantity, lot.Cost));
    }


    private static InvestmentTransaction Action(
        InvestmentTransactionType type,
        int day,
        SecurityId security,
        decimal quantity,
        SecurityId? to,
        decimal received = 0m,
        decimal cash = 0m,
        decimal? costShare = null) => new()
        {
            SecurityId = security,
            RelatedSecurityId = to,
            Type = type,
            Date = new DateOnly(2026, 6, day),
            CreatedAt = new DateTimeOffset(2026, 6, day, 0, 0, 0, TimeSpan.Zero),
            Quantity = quantity,
            RelatedQuantity = received,
            CostShare = costShare,
            CashAmount = new Money(cash, Currency.Eur),
            ReportingAmount = cash,
        };
}
