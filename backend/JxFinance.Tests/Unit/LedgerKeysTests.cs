using JxFinance.Endpoints.TransactionGroups.Services;
using JxFinance.Endpoints.Transactions.GetLedger;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.Services;
using JxFinance.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Unit;

public sealed class LedgerKeysTests
{
    [Theory]
    [InlineData(TransactionSortField.Date)]
    [InlineData(TransactionSortField.Description)]
    [InlineData(TransactionSortField.Category)]
    [InlineData(TransactionSortField.Account)]
    [InlineData(TransactionSortField.Amount)]
    public async Task Every_sort_pages_one_union_of_ungrouped_transactions_and_groups_in_sql(TransactionSortField sort)
    {
        await using var capture = new SqlCapture();

        await LedgerKeys.Sorted(LedgerKeys.Of(capture.Db, capture.Db.Transactions, sort), sort, true)
            .Skip(50)
            .Take(25)
            .ToListAsync(TestContext.Current.CancellationToken);

        var statement = capture.OnlyStatement;
        Assert.Contains("UNION ALL", statement, StringComparison.Ordinal);
        Assert.Contains("FROM \"TransactionGroups\"", statement, StringComparison.Ordinal);
        Assert.Contains("\"GroupId\" IS NULL", statement, StringComparison.Ordinal);
        Assert.Contains("ORDER BY", statement, StringComparison.Ordinal);
        Assert.Contains("LIMIT @", statement, StringComparison.Ordinal);
        Assert.Contains("OFFSET @", statement, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_group_takes_its_newest_matching_member_as_its_date()
    {
        await using var capture = new SqlCapture();

        await LedgerKeys.Sorted(LedgerKeys.Of(capture.Db, capture.Db.Transactions, TransactionSortField.Date), TransactionSortField.Date, true)
            .ToListAsync(TestContext.Current.CancellationToken);

        var statement = capture.OnlyStatement;
        Assert.Contains("max(", statement, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("sum(", statement, StringComparison.OrdinalIgnoreCase);
        Assert.Matches("ORDER BY [^\\n]*\"Date\" DESC, [^\\n]*\"CreatedAt\" DESC", statement);
    }

    [Fact]
    public async Task A_group_sorts_by_the_size_of_its_net_amount()
    {
        await using var capture = new SqlCapture();

        await LedgerKeys.Sorted(LedgerKeys.Of(capture.Db, capture.Db.Transactions, TransactionSortField.Amount), TransactionSortField.Amount, false)
            .ToListAsync(TestContext.Current.CancellationToken);

        var statement = capture.OnlyStatement;
        Assert.Contains("abs(", statement, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("sum(", statement, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("max(", statement, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(TransactionSortField.Category, "\"Categories\"")]
    [InlineData(TransactionSortField.Account, "\"Accounts\"")]
    public async Task Groups_follow_every_transaction_when_sorting_by_a_name_they_do_not_have(TransactionSortField sort, string table)
    {
        await using var capture = new SqlCapture();

        await LedgerKeys.Sorted(LedgerKeys.Of(capture.Db, capture.Db.Transactions, sort), sort, true)
            .ToListAsync(TestContext.Current.CancellationToken);

        var statement = capture.OnlyStatement;
        Assert.Contains(table, statement, StringComparison.Ordinal);
        Assert.Matches("ORDER BY [^\\n]*\"Kind\", [^\\n]*\"Name\" DESC", statement);
    }

    [Fact]
    public async Task The_group_list_counts_and_dates_the_members_in_one_query()
    {
        await using var capture = new SqlCapture();
        var service = new TransactionGroupService(capture.Db, new FixedUser(Guid.NewGuid()), null!, null!);

        await service.GetAllAsync(TestContext.Current.CancellationToken);

        var statement = capture.OnlyStatement;
        Assert.Contains("FROM \"TransactionGroups\"", statement, StringComparison.Ordinal);
        Assert.Contains("count(*)", statement, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("min(", statement, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("max(", statement, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void The_kinds_of_a_ledger_item_sort_transactions_first()
    {
        Assert.True(LedgerItemKind.Transaction < LedgerItemKind.Group);
    }
}
