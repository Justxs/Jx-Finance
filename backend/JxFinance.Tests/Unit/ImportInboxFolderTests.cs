using JxFinance.Infrastructure.Imports;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Unit;

public sealed class ImportInboxFolderTests : IDisposable
{
    private static readonly DateTimeOffset Now = new(2026, 10, 1, 12, 0, 0, TimeSpan.Zero);

    private readonly string _root = Path.Combine(Path.GetTempPath(), "jx-inbox-tests", Guid.NewGuid().ToString("N"));
    private readonly ImportInboxFolder _folder;

    public ImportInboxFolderTests()
    {
        Directory.CreateDirectory(_root);
        _folder = new ImportInboxFolder(_root, new TestClock(Now));
    }

    public void Dispose() => Directory.Delete(_root, recursive: true);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void An_unset_folder_turns_the_inbox_off(string? directory)
    {
        var folder = new ImportInboxFolder(directory, new TestClock(Now));

        Assert.Null(folder.Directory);
        Assert.Empty(folder.Ready());
        Assert.Empty(folder.RecentFailures());
    }

    [Fact]
    public void A_folder_that_does_not_exist_has_nothing_ready() =>
        Assert.Empty(new ImportInboxFolder(Path.Combine(_root, "missing"), new TestClock(Now)).Ready());

    [Fact]
    public void A_file_written_less_than_a_minute_ago_waits_for_the_next_pass()
    {
        Drop("settled.xml", Now.AddMinutes(-1));
        Drop("copying.xml", Now.AddSeconds(-59));

        Assert.Equal(["settled.xml"], Names(_folder.Ready()));
    }

    [Fact]
    public void Temporary_hidden_and_outcome_files_are_left_out()
    {
        foreach (var name in new[] { ".hidden.xml", "~lock.csv", "export.csv.tmp", "export.csv.PART", "statement.xml" })
            Drop(name);
        Drop(Path.Combine("done", "old.xml"));
        Drop(Path.Combine("failed", "bad.xml"));
        Drop(Path.Combine(".sync", "copy.xml"));
        Drop(Path.Combine("LT121000011101001000", "nested", "deep.xml"));

        Assert.Equal(["statement.xml"], Names(_folder.Ready()));
    }

    [Fact]
    public void Files_in_a_subfolder_carry_its_name_and_come_oldest_first()
    {
        Drop(Path.Combine("LT12 1000", "later.csv"), Now.AddMinutes(-2));
        Drop("earlier.xml", Now.AddMinutes(-10));

        var ready = _folder.Ready();

        Assert.Equal(["earlier.xml", "later.csv"], Names(ready));
        Assert.Equal([null, "LT12 1000"], ready.Select(entry => entry.Folder));
    }

    [Fact]
    public void A_used_file_moves_to_done_under_its_subfolder()
    {
        Drop(Path.Combine("LT12", "statement.csv"));

        _folder.Done(_folder.Ready().Single());

        Assert.True(File.Exists(Path.Combine(_root, "done", "LT12", "statement.csv")));
        Assert.False(File.Exists(Path.Combine(_root, "LT12", "statement.csv")));
        Assert.Empty(_folder.Ready());
    }

    [Fact]
    public void A_refused_file_moves_to_failed_with_its_reason_beside_it()
    {
        Drop(Path.Combine("LT12", "statement.csv"));

        _folder.Fail(_folder.Ready().Single(), "No account has the IBAN LT12.");

        Assert.True(File.Exists(Path.Combine(_root, "failed", "LT12", "statement.csv")));
        Assert.Equal("No account has the IBAN LT12.", File.ReadAllText(Path.Combine(_root, "failed", "LT12", "statement.csv.reason.txt")));
        var failure = Assert.Single(_folder.RecentFailures());
        Assert.Equal("LT12/statement.csv", failure.FileName);
        Assert.Equal("No account has the IBAN LT12.", failure.Reason);
    }

    [Fact]
    public void A_name_already_in_done_gets_a_unique_one_and_keeps_the_first()
    {
        Drop(Path.Combine("done", "statement.xml"));
        File.WriteAllText(Path.Combine(_root, "done", "statement.xml"), "first");
        Drop("statement.xml");

        _folder.Done(_folder.Ready().Single());

        var done = Directory.GetFiles(Path.Combine(_root, "done")).Select(Path.GetFileName).ToList();
        Assert.Equal(2, done.Count);
        Assert.Equal("first", File.ReadAllText(Path.Combine(_root, "done", "statement.xml")));
        Assert.Contains(done, name => name!.StartsWith("statement-", StringComparison.Ordinal) && name.EndsWith(".xml", StringComparison.Ordinal));
    }

    [Fact]
    public void A_name_whose_reason_file_is_still_in_failed_gets_a_unique_one()
    {
        Drop("statement.xml");
        _folder.Fail(_folder.Ready().Single(), "first");
        File.Delete(Path.Combine(_root, "failed", "statement.xml"));
        Drop("statement.xml");

        _folder.Fail(_folder.Ready().Single(), "second");

        Assert.Equal("first", File.ReadAllText(Path.Combine(_root, "failed", "statement.xml.reason.txt")));
        Assert.Equal(["first", "second"], _folder.RecentFailures().Select(failure => failure.Reason).Order());
    }

    [Fact]
    public void Only_the_latest_twenty_failures_are_listed_newest_first()
    {
        var failed = Path.Combine(_root, "failed");
        Directory.CreateDirectory(failed);
        for (var i = 0; i < 25; i++)
        {
            var reason = Path.Combine(failed, $"file-{i:00}.xml.reason.txt");
            File.WriteAllText(reason, $" reason {i} \n");
            File.SetLastWriteTimeUtc(reason, Now.AddMinutes(i - 100).UtcDateTime);
        }

        var failures = _folder.RecentFailures();

        Assert.Equal(ImportInboxFolder.ListedFailures, failures.Count);
        Assert.Equal("file-24.xml", failures[0].FileName);
        Assert.Equal("reason 24", failures[0].Reason);
        Assert.Equal(Now.AddMinutes(-76), failures[0].At);
        Assert.Equal("file-05.xml", failures[^1].FileName);
    }

    private void Drop(string relativePath, DateTimeOffset? writtenAt = null)
    {
        var path = Path.Combine(_root, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, "content");
        File.SetLastWriteTimeUtc(path, (writtenAt ?? Now.AddMinutes(-5)).UtcDateTime);
    }

    private static List<string> Names(IEnumerable<InboxEntry> entries) => entries.Select(entry => entry.File.Name).ToList();
}
