using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Tests.Unit;

public sealed class PortfolioTests
{
    private static readonly SecurityId Fund = SecurityId.New();

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
}
