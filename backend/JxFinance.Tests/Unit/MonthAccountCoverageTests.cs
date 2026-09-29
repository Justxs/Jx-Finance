using JxFinance.Endpoints.MonthCloses.Shared;

namespace JxFinance.Tests.Unit;

public sealed class MonthAccountCoverageTests
{
    private static readonly DateOnly MonthEnd = new(2026, 8, 31);

    [Fact]
    public void A_statement_that_agrees_is_reconciled_whatever_the_imports_say()
    {
        Assert.Equal(MonthAccountState.Reconciled, MonthAccountCoverage.StateOf(MonthEnd, 0m, null));
        Assert.Equal(MonthAccountState.Reconciled, MonthAccountCoverage.StateOf(MonthEnd, 0m, new DateOnly(2026, 8, 20)));
    }

    [Fact]
    public void A_statement_that_differs_wins_over_an_import_through_the_month_end()
    {
        Assert.Equal(MonthAccountState.Differs, MonthAccountCoverage.StateOf(MonthEnd, -12.30m, MonthEnd));
    }

    [Fact]
    public void Without_a_statement_the_latest_import_decides()
    {
        Assert.Equal(MonthAccountState.Imported, MonthAccountCoverage.StateOf(MonthEnd, null, MonthEnd));
        Assert.Equal(MonthAccountState.Imported, MonthAccountCoverage.StateOf(MonthEnd, null, new DateOnly(2026, 9, 3)));
        Assert.Equal(MonthAccountState.Behind, MonthAccountCoverage.StateOf(MonthEnd, null, new DateOnly(2026, 8, 30)));
        Assert.Equal(MonthAccountState.Behind, MonthAccountCoverage.StateOf(MonthEnd, null, null));
    }
}
