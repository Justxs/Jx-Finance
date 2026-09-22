using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Unit;

public sealed class QueryFilterTests
{
    private const string OwnedByCaller = "\"UserId\" = @";

    [Fact]
    public async Task An_owned_set_is_scoped_to_the_owner_and_to_the_living_rows()
    {
        await using var capture = new SqlCapture();

        await capture.Db.Budgets.ToListAsync(TestContext.Current.CancellationToken);

        Assert.Contains(NotDeleted("b"), capture.OnlyStatement, StringComparison.Ordinal);
        Assert.Contains(OwnedByCaller, capture.OnlyStatement, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Dropping_the_owner_filter_keeps_the_soft_delete_one()
    {
        await using var capture = new SqlCapture();

        await capture.Db.Budgets
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .ToListAsync(TestContext.Current.CancellationToken);

        Assert.Contains(NotDeleted("b"), capture.OnlyStatement, StringComparison.Ordinal);
        Assert.DoesNotContain(OwnedByCaller, capture.OnlyStatement, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Dropping_the_soft_delete_filter_keeps_the_owner_one()
    {
        await using var capture = new SqlCapture();

        await capture.Db.Budgets
            .IgnoreQueryFilters(QueryFilters.SoftDeleteOnly)
            .ToListAsync(TestContext.Current.CancellationToken);

        Assert.DoesNotContain(NotDeleted("b"), capture.OnlyStatement, StringComparison.Ordinal);
        Assert.Contains(OwnedByCaller, capture.OnlyStatement, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Dropping_every_filter_leaves_the_set_unscoped()
    {
        await using var capture = new SqlCapture();

        await capture.Db.Budgets
            .IgnoreQueryFilters()
            .ToListAsync(TestContext.Current.CancellationToken);

        Assert.DoesNotContain("WHERE", capture.OnlyStatement, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_shared_set_drops_its_household_reach_with_the_owner_filter()
    {
        await using var capture = new SqlCapture();

        await capture.Db.Categories
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .ToListAsync(TestContext.Current.CancellationToken);

        Assert.DoesNotContain("HouseholdMemberships", capture.OnlyStatement, StringComparison.Ordinal);
        Assert.Contains(NotDeleted("c"), capture.OnlyStatement, StringComparison.Ordinal);
    }

    [Fact]
    public async Task An_account_scoped_set_drops_its_account_reach_with_the_owner_filter()
    {
        await using var capture = new SqlCapture();

        await capture.Db.Transactions
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .ToListAsync(TestContext.Current.CancellationToken);

        Assert.DoesNotContain("Accounts", capture.OnlyStatement, StringComparison.Ordinal);
        Assert.Contains(NotDeleted("t"), capture.OnlyStatement, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_set_that_has_no_owner_filter_is_left_with_its_soft_delete_one()
    {
        await using var capture = new SqlCapture();

        await capture.Db.Securities
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .ToListAsync(TestContext.Current.CancellationToken);

        Assert.Contains(NotDeleted("s"), capture.OnlyStatement, StringComparison.Ordinal);
    }

    private static string NotDeleted(string alias) => $"NOT ({alias}.\"IsDeleted\")";
}
