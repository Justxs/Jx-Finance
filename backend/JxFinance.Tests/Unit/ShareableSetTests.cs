using JxFinance.Common.Sharing;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Infrastructure.Data;

namespace JxFinance.Tests.Unit;

public sealed class ShareableSetTests
{
    private static readonly HouseholdId Household = new(Guid.NewGuid());

    [Fact]
    public void Every_shareable_entity_has_a_set()
    {
        var expected = typeof(IShareable).Assembly.GetTypes()
            .Where(type => type is { IsClass: true, IsAbstract: false } && typeof(IShareable).IsAssignableFrom(type))
            .ToHashSet();

        Assert.Equal(expected, ShareableSet.All.Select(set => set.EntityType).ToHashSet());
    }

    [Fact]
    public void Every_set_remembers_its_shares_under_its_own_kind()
    {
        var kinds = ShareableSet.All.Select(set => set.ShareKind).ToList();

        Assert.Equal(kinds.Count, kinds.Distinct().Count());
    }

    [Fact]
    public async Task Listing_a_household_translates_for_every_set()
    {
        var sql = await CaptureAsync((set, db) => set.InHouseholdAsync(db, Household, TestContext.Current.CancellationToken));

        Assert.All(sql, statement => Assert.Contains("\"HouseholdId\" = @", statement, StringComparison.Ordinal));
    }

    [Fact]
    public async Task Making_rows_personal_translates_for_every_set()
    {
        var sql = await CaptureAsync((set, db) =>
            set.MakePersonalAsync(db, Household, Guid.NewGuid(), DateTimeOffset.UnixEpoch, TestContext.Current.CancellationToken));

        Assert.All(sql, SetsSharing);
    }

    [Fact]
    public async Task Resharing_rows_translates_for_every_set()
    {
        var sql = await CaptureAsync((set, db) => set.ReshareAsync(
            db,
            [Guid.NewGuid()],
            [Guid.NewGuid()],
            Household,
            DateTimeOffset.UnixEpoch,
            TestContext.Current.CancellationToken));

        Assert.All(sql, SetsSharing);
    }

    private static void SetsSharing(string statement)
    {
        Assert.StartsWith("UPDATE", statement, StringComparison.Ordinal);
        Assert.Contains("\"HouseholdId\" = @", statement, StringComparison.Ordinal);
        Assert.Contains("\"Scope\" = @", statement, StringComparison.Ordinal);
        Assert.Contains("\"UpdatedAt\" = CASE", statement, StringComparison.Ordinal);
    }

    private static async Task<IReadOnlyList<string>> CaptureAsync(Func<ShareableSet, AppDbContext, Task> run)
    {
        await using var capture = new SqlCapture();

        foreach (var set in ShareableSet.All)
        {
            await run(set, capture.Db);
        }

        Assert.Equal(ShareableSet.All.Count, capture.Statements.Count);
        return capture.Statements;
    }
}
