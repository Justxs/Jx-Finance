using JxFinance.Tests.Support.Journal;

namespace JxFinance.Tests.Unit;

public sealed class JournalCheckerTests
{
    private const string Header = "option \"operating_currency\" \"EUR\"\noption \"booking_method\" \"FIFO\"\n\n2026-01-01 open Assets:Bank:Main\n\n2026-01-01 open Assets:Broker\n\n2026-01-01 open Expenses:Food\n\n2026-01-01 open Income:Gains\n";

    [Theory]
    [InlineData("2026-02-01 * \"Lunch\"\n  Assets:Bank:Main  -10.00 EUR\n  Expenses:Food  9.00 EUR\n", "does not balance")]
    [InlineData("2026-02-01 * \"Lunch\"\n  Assets:Bank:Main  -10.00 EUR\n  Expenses:Drinks  10.00 EUR\n", "never opened")]
    [InlineData("2025-12-31 * \"Lunch\"\n  Assets:Bank:Main  -10.00 EUR\n  Expenses:Food  10.00 EUR\n", "before it opens")]
    [InlineData("2026-02-01 * \"Lunch\"\n  Assets:Bank:Main  -10.00 EUR\n  Expenses:food  10.00 EUR\n", "Invalid account name")]
    [InlineData("2026-02-01 * \"Lunch\"\n  Assets:Bank:Main  -10.00 eur\n  Expenses:Food  10.00 EUR\n", "Invalid amount")]
    [InlineData("2026-02-01 * \"Lunch\n  Assets:Bank:Main  -10.00 EUR\n  Expenses:Food  10.00 EUR\n", "Unsupported or invalid directive")]
    [InlineData("2026-02-01 * \"Lunch\"\n  Assets:Bank:Main\n  Expenses:Food\n", "More than one posting without an amount")]
    [InlineData("2026-02-01 * \"Swap\"\n  Assets:Bank:Main  -10.00 EUR\n  Assets:Bank:Main  11.00 USD @@ -10.00 EUR\n", "negative price")]
    [InlineData("2026-02-01 * \"Sell\"\n  Assets:Broker  -1 ABC {}\n  Assets:Broker  10.00 EUR\n  Income:Gains\n", "needs a cost")]
    [InlineData("2026-02-01 * \"Buy\"\n  Assets:Broker  2 ABC {{20.00 EUR}}\n  Assets:Bank:Main  -20.00 EUR\n\n2026-02-02 * \"Sell\"\n  Assets:Broker  -3 ABC {}\n  Assets:Bank:Main  30.00 EUR\n  Income:Gains\n", "not enough")]
    [InlineData("2026-02-01 * \"Lunch\"\n  Assets:Bank:Main  -10.00 EUR\n  Expenses:Food  10.00 EUR\n\n2026-02-01 balance Assets:Bank:Main  -10.00 EUR\n", "Balance failed")]
    [InlineData("2026-01-01 open Assets:Bank:Main\n", "Duplicate open")]
    public void The_checker_refuses_what_Beancount_refuses(string body, string error)
    {
        var journal = JournalChecker.Check(Header + "\n" + body);

        Assert.Contains(journal.Errors, e => e.Contains(error, StringComparison.Ordinal));
    }

    [Fact]
    public void FIFO_takes_the_oldest_lots_first_and_a_balance_counts_the_day_before()
    {
        var journal = JournalChecker.Accepted(Header + """

            2026-02-02 * "Later buy"
              Assets:Broker  1 ABC {{15.00 EUR}}
              Assets:Bank:Main  -15.00 EUR

            2026-02-01 * "First buy"
              Assets:Broker  2 ABC {{20.00 EUR}}
              Assets:Bank:Main  -20.00 EUR

            2026-02-03 * "Sell"
              Assets:Broker  -2 ABC {} @ 12 EUR
              Assets:Bank:Main  24.00 EUR
              Income:Gains  -4.00 EUR

            2026-02-03 balance Assets:Broker  3 ABC

            2026-02-04 balance Assets:Broker  1 ABC

            2026-02-04 balance Assets:Bank:Main  -11.00 EUR

            """.Replace("\r", string.Empty, StringComparison.Ordinal));

        Assert.Equal(3, journal.Assertions.Count);
    }
}
