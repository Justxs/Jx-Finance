using JxFinance.Common.Journal;
using JxFinance.Tests.Support.Journal;

namespace JxFinance.Tests.Unit;

public sealed class BeancountNamesTests
{
    [Fact]
    public void Every_Lithuanian_letter_becomes_its_ASCII_letter()
    {
        Assert.Equal("ACEEISUUZaceeisuuz", BeancountNames.Component("ĄČĘĖĮŠŲŪŽąčęėįšųūž"));
    }

    [Theory]
    [InlineData("Šeimos sąskaita", "Seimos-saskaita")]
    [InlineData("groceries & more", "Groceries-more")]
    [InlineData("  Main  ", "Main")]
    [InlineData("€ / ¥", "X")]
    [InlineData("", "X")]
    [InlineData("2nd card", "2nd-card")]
    [InlineData("401k", "401k")]
    public void A_name_becomes_one_valid_account_component(string name, string component)
    {
        Assert.Equal(component, BeancountNames.Component(name));
        Assert.True(JournalChecker.IsAccount($"Assets:{component}"));
    }

    [Fact]
    public void A_name_that_is_taken_gets_a_numbered_suffix()
    {
        var names = new BeancountNames();
        names.Reserve("Expenses:Uncategorized");

        Assert.Equal("Assets:Bank:Main", names.Unique("Assets:Bank", "Main"));
        Assert.Equal("Assets:Bank:Main-2", names.Unique("Assets:Bank", "Main"));
        Assert.Equal("Assets:Bank:Main-3", names.Unique("Assets:Bank", "main"));
        Assert.Equal("Assets:Savings:Main", names.Unique("Assets:Savings", "Main"));
        Assert.Equal("Expenses:Uncategorized-2", names.Unique("Expenses", "Uncategorized"));
    }
}
