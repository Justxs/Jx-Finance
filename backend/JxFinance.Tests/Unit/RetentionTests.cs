using JxFinance.Domain.Audit;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Tests.Support;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting.Internal;

namespace JxFinance.Tests.Unit;

public sealed class RetentionTests
{
    private static readonly TestClock Clock = new(new DateTimeOffset(2026, 9, 23, 10, 0, 0, TimeSpan.Zero));

    [Fact]
    public void The_purge_starts_at_the_same_instant_the_trash_stops_restoring()
    {
        var now = Clock.UtcNow;

        Assert.Equal(DeletionEntry.WindowStart(now), Retention.PurgeStart(now));
        Assert.Equal(now.AddDays(-DeletionEntry.RetentionDays), Retention.PurgeStart(now));
    }

    [Fact]
    public void A_record_deleted_exactly_on_the_boundary_is_restorable_and_not_purged()
    {
        var now = Clock.UtcNow;
        var deletedAt = Retention.PurgeStart(now);

        Assert.False(deletedAt < DeletionEntry.WindowStart(now));
        Assert.False(deletedAt < Retention.PurgeStart(now));
    }

    [Fact]
    public void Audit_events_keep_their_own_longer_window()
    {
        var now = Clock.UtcNow;

        Assert.Equal(now.AddDays(-AuditEvent.RetentionDays), AuditEvent.RetentionStart(now));
        Assert.True(AuditEvent.RetentionStart(now) < Retention.PurgeStart(now));
    }

    [Fact]
    public void Every_trash_kind_is_either_purged_or_deliberately_kept()
    {
        var decided = Retention.PurgedKinds.Concat(Retention.KeptKinds).ToList();

        Assert.Equal(decided.Count, decided.Distinct().Count());
        Assert.Equal(Enum.GetValues<TrashKind>().ToHashSet(), decided.ToHashSet());
    }

    [Fact]
    public async Task Pruning_sessions_deletes_the_expired_ones_and_the_ones_of_a_changed_stamp()
    {
        await using var capture = new SqlCapture();

        await Retention.PruneSessionsAsync(capture.Db, Clock.UtcNow, TestContext.Current.CancellationToken);

        var statement = capture.OnlyStatement;
        Assert.Contains("DELETE FROM \"UserSessions\"", statement, StringComparison.Ordinal);
        Assert.Contains("\"ExpiresAt\" <= @", statement, StringComparison.Ordinal);
        Assert.Contains("\"SecurityStamp\"", statement, StringComparison.Ordinal);
        Assert.Contains("AspNetUsers", statement, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Pruning_audit_events_deletes_by_the_occurrence_time()
    {
        await using var capture = new SqlCapture();

        await Retention.PruneAuditEventsAsync(capture.Db, Clock.UtcNow, TestContext.Current.CancellationToken);

        var statement = capture.OnlyStatement;
        Assert.Contains("DELETE FROM \"AuditEvents\"", statement, StringComparison.Ordinal);
        Assert.Contains("\"OccurredAt\" < @", statement, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Pruning_trash_entries_ignores_the_ownership_filter_and_pages_by_id()
    {
        await using var capture = new SqlCapture();

        await Retention.PruneDeletionEntriesAsync(capture.Db, Clock.UtcNow, TestContext.Current.CancellationToken);

        var statement = capture.OnlyStatement;
        Assert.StartsWith("DELETE FROM \"DeletionEntries\"", statement, StringComparison.Ordinal);
        Assert.Contains("\"DeletedAt\" < @", statement, StringComparison.Ordinal);
        Assert.DoesNotContain("\"UserId\" = @", statement, StringComparison.Ordinal);
        Assert.Contains("LIMIT @", statement, StringComparison.Ordinal);
    }

    [Fact]
    public async Task The_purge_deletes_every_kind_it_owns_in_batches_and_frees_fee_transactions_first()
    {
        await using var capture = new SqlCapture();
        using var store = new AttachmentDirectory();

        await Retention.PurgeDeletedAsync(capture.Db, store.Files, Clock.UtcNow, TestContext.Current.CancellationToken);

        var tables = capture.Statements.Select(Table).ToList();
        Assert.Equal(
            [
                "CurrencyConversions",
                "TransferImports",
                "Transfers",
                "TransactionAttachments",
                "Transactions",
                "Budgets",
                "Goals",
                "Assets",
                "Debts",
                "RecurringBills",
                "InvestmentTransactions",
                "CategorizationRules",
            ],
            tables);
        Assert.All(
            capture.Statements,
            statement =>
            {
                Assert.Contains("\"IsDeleted\"", statement, StringComparison.Ordinal);
                Assert.Contains("\"UpdatedAt\" < @", statement, StringComparison.Ordinal);
                Assert.DoesNotContain("\"UserId\" = @", statement, StringComparison.Ordinal);
            });
        Assert.All(
            capture.Statements.Where(statement => Table(statement) != "TransactionAttachments"),
            statement =>
            {
                Assert.StartsWith("DELETE FROM", statement, StringComparison.Ordinal);
                Assert.Contains("LIMIT @", statement, StringComparison.Ordinal);
            });
    }

    [Fact]
    public async Task The_purge_never_takes_a_transaction_a_conversion_still_points_at()
    {
        await using var capture = new SqlCapture();
        using var store = new AttachmentDirectory();

        await Retention.PurgeDeletedAsync(capture.Db, store.Files, Clock.UtcNow, TestContext.Current.CancellationToken);

        var transactions = capture.Statements.Single(statement => Table(statement) == "Transactions");
        Assert.Contains("NOT EXISTS", transactions, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("\"FeeTransactionId\"", transactions, StringComparison.Ordinal);
    }

    private static string Table(string statement)
    {
        var from = statement.IndexOf("FROM \"", StringComparison.Ordinal) + "FROM \"".Length;
        return statement[from..statement.IndexOf('"', from)];
    }

    private sealed class AttachmentDirectory : IDisposable
    {
        private readonly string path = Path.Combine(Path.GetTempPath(), "jx-retention", Guid.NewGuid().ToString("N"));

        public AttachmentDirectory()
        {
            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { [ConfigKeys.AttachmentDirectory] = path })
                .Build();
            Files = new AttachmentStore(configuration, new HostingEnvironment { ContentRootPath = path }, new TestClock());
        }

        public AttachmentStore Files { get; }

        public void Dispose()
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, recursive: true);
            }
        }
    }
}
