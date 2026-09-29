using JxFinance.Common.Notifications;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Dashboard.Shared;
using JxFinance.Endpoints.MonthCloses.Shared;
using JxFinance.Endpoints.Reports.Shared;

namespace JxFinance.Tests.Unit;

public sealed class MonthlyDigestTests
{
    private static readonly DateOnly August = new(2026, 8, 1);

    [Fact]
    public void The_movers_are_the_three_largest_absolute_changes_synthetic_groups_included()
    {
        var digest = MonthlyDigest.From(
            Review(
                3200m,
                2450m,
                [
                    Item("Groceries", 420m, 380m),
                    Item("Rent", 800m, 800m),
                    Item("Travel", 0m, 600m),
                    Item("Fees", 150m, null, SyntheticCategoryGroup.InvestmentTaxesAndFees),
                    Item("Dining", 90m, 30m),
                ]),
            Currency.Eur)!;

        Assert.Equal(
            [("Travel", "0.00", "600.00"), ("Fees", "150.00", "0.00"), ("Dining", "90.00", "30.00")],
            digest.Movers.Select(m => (m.Name, m.Amount, m.Previous)));
        Assert.Equal(("3200.00", "2450.00", "750.00", 23), (digest.Income, digest.Expense, digest.Net, digest.KeptPercent));
        Assert.Equal(Currency.Eur, digest.Currency);
    }

    [Fact]
    public void The_kept_share_is_null_without_income_and_zero_when_overspent()
    {
        Assert.Null(MonthlyDigest.From(Review(0m, 50m, []), Currency.Eur)!.KeptPercent);
        Assert.Equal(0, MonthlyDigest.From(Review(100m, 150m, []), Currency.Eur)!.KeptPercent);
    }

    [Fact]
    public void An_empty_month_gives_no_digest_unless_something_is_open()
    {
        Assert.Null(MonthlyDigest.From(Review(0m, 0m, []), Currency.Eur));
        Assert.NotNull(MonthlyDigest.From(Review(0m, 0m, [], uncategorized: 1), Currency.Eur));
        Assert.NotNull(MonthlyDigest.From(Review(0m, 0m, [], accounts: [MonthAccountState.Behind]), Currency.Eur));
    }

    [Fact]
    public void Accounts_that_differ_or_are_behind_need_attention()
    {
        var digest = MonthlyDigest.From(
            Review(
                10m,
                5m,
                [],
                accounts: [MonthAccountState.Reconciled, MonthAccountState.Differs, MonthAccountState.Imported, MonthAccountState.Behind],
                status: MonthCloseStatus.ClosedChanged),
            Currency.Eur)!;

        Assert.Equal(2, digest.AccountsNeedingAttention);
        Assert.True(digest.Closed);
    }

    private static CategoryBreakdownItem Item(string name, decimal amount, decimal? previous, SyntheticCategoryGroup? group = null) =>
        new(group is null ? Guid.NewGuid() : null, name, null, amount, group, previous);

    private static MonthReviewResponse Review(
        decimal income,
        decimal expense,
        IReadOnlyList<CategoryBreakdownItem> expenses,
        int uncategorized = 0,
        IReadOnlyList<MonthAccountState>? accounts = null,
        MonthCloseStatus status = MonthCloseStatus.Open) =>
        new(
            August,
            new DateOnly(2026, 8, 31),
            status,
            null,
            null,
            new MonthChecklist(
                uncategorized,
                0,
                null,
                (accounts ?? []).Select(state => new MonthAccountCoverage(Guid.NewGuid(), "Account", state, null, null, Currency.Eur)).ToList()),
            new ReportSummaryResponse(August, new DateOnly(2026, 8, 31), income, expense, income - expense, expenses, [], [], "day", [], []),
            null,
            null,
            null,
            null);
}
