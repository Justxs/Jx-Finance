using System.Text;
using JxFinance.Infrastructure.Backups;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting.Internal;

namespace JxFinance.Tests.Unit;

public sealed class BackupStoreTests : IDisposable
{
    private readonly string directory = Path.Combine(Path.GetTempPath(), "jx-backup-store", Guid.NewGuid().ToString("N"));
    private readonly BackupStore store;

    public BackupStoreTests()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["App:BackupDirectory"] = directory })
            .Build();
        store = new BackupStore(configuration, new HostingEnvironment { ContentRootPath = directory });
    }

    public void Dispose()
    {
        if (Directory.Exists(directory)) Directory.Delete(directory, recursive: true);
    }

    [Fact]
    public async Task Added_backup_is_found_listed_and_readable_and_leaves_no_temporary_file()
    {
        var id = Guid.NewGuid();

        var added = await AddAsync(id, "payload");

        Assert.Equal(7, added.SizeBytes);
        Assert.Equal(added, await store.FindAsync(id, TestContext.Current.CancellationToken));
        Assert.Equal([id], (await store.ListAsync(TestContext.Current.CancellationToken)).Select(b => b.Id));
        await using var stream = store.OpenRead(id);
        using var reader = new StreamReader(stream);
        Assert.Equal("payload", await reader.ReadToEndAsync(TestContext.Current.CancellationToken));
        Assert.Empty(Directory.EnumerateFiles(directory, "*.tmp"));
    }

    [Fact]
    public async Task Failed_write_leaves_nothing_behind()
    {
        var id = Guid.NewGuid();

        await Assert.ThrowsAsync<InvalidOperationException>(() => store.AddAsync(
            id,
            async stream =>
            {
                await stream.WriteAsync(Encoding.UTF8.GetBytes("half"), TestContext.Current.CancellationToken);
                throw new InvalidOperationException("The database went away.");
            },
            TestContext.Current.CancellationToken));

        Assert.Empty(Directory.EnumerateFiles(directory));
    }

    [Fact]
    public async Task Data_file_is_removed_when_its_info_file_cannot_be_written()
    {
        var id = Guid.NewGuid();
        using var cancellation = new CancellationTokenSource();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => store.AddAsync(
            id,
            async stream =>
            {
                await stream.WriteAsync(Encoding.UTF8.GetBytes("payload"), TestContext.Current.CancellationToken);
                await cancellation.CancelAsync();
                return Info(id);
            },
            cancellation.Token));

        Assert.Empty(Directory.EnumerateFiles(directory));
        Assert.Null(await store.FindAsync(id, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Listing_sweeps_old_orphans_and_keeps_fresh_ones_and_complete_backups()
    {
        var kept = Guid.NewGuid();
        await AddAsync(kept, "payload");
        var oldTemporary = Touch($"{Guid.NewGuid():N}.tmp", hoursOld: 2);
        var oldData = Touch($"{Guid.NewGuid():N}.json.gz", hoursOld: 2);
        var freshTemporary = Touch($"{Guid.NewGuid():N}.tmp", hoursOld: 0);
        var freshData = Touch($"{Guid.NewGuid():N}.json.gz", hoursOld: 0);
        File.SetLastWriteTimeUtc(Path.Combine(directory, $"{kept:N}.json.gz"), DateTime.UtcNow.AddHours(-5));

        var listed = await store.ListAsync(TestContext.Current.CancellationToken);

        Assert.Equal([kept], listed.Select(b => b.Id));
        Assert.False(File.Exists(oldTemporary));
        Assert.False(File.Exists(oldData));
        Assert.True(File.Exists(freshTemporary));
        Assert.True(File.Exists(freshData));
    }

    [Fact]
    public async Task Data_file_without_info_is_not_listed_and_delete_removes_both_files()
    {
        var id = Guid.NewGuid();
        await AddAsync(id, "payload");
        Touch($"{Guid.NewGuid():N}.json.gz", hoursOld: 0);

        Assert.Equal([id], (await store.ListAsync(TestContext.Current.CancellationToken)).Select(b => b.Id));

        store.Delete(id);

        Assert.Null(await store.FindAsync(id, TestContext.Current.CancellationToken));
        Assert.Empty(await store.ListAsync(TestContext.Current.CancellationToken));
    }

    private static StoredBackup Info(Guid id) =>
        new(id, new DateTimeOffset(2026, 9, 19, 8, 0, 0, TimeSpan.Zero), "note", "20260919000000_Test", 3, 42, Uploaded: false);

    private Task<StoredBackup> AddAsync(Guid id, string content) =>
        store.AddAsync(
            id,
            async stream =>
            {
                await stream.WriteAsync(Encoding.UTF8.GetBytes(content), TestContext.Current.CancellationToken);
                return Info(id);
            },
            TestContext.Current.CancellationToken);

    private string Touch(string name, int hoursOld)
    {
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, name);
        File.WriteAllText(path, "orphan");
        File.SetLastWriteTimeUtc(path, DateTime.UtcNow.AddHours(-hoursOld));
        return path;
    }
}
