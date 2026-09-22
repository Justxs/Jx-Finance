using System.Text.Json;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Configuration;

namespace JxFinance.Infrastructure.Backups;

public sealed class BackupStore(IConfiguration configuration, IHostEnvironment environment, IClock clock)
{
    private const string DocumentSuffix = ".json.gz";
    private const string ArchiveSuffix = ".zip";
    private const string InfoSuffix = ".info.json";
    private const string TemporarySuffix = ".tmp";

    private static readonly TimeSpan OrphanAge = TimeSpan.FromHours(1);

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly string directory = string.IsNullOrWhiteSpace(configuration[ConfigKeys.BackupDirectory])
        ? Path.Combine(environment.ContentRootPath, "backups")
        : configuration[ConfigKeys.BackupDirectory]!;

    public async Task<IReadOnlyList<StoredBackup>> ListAsync(CancellationToken cancellationToken)
    {
        if (!Directory.Exists(directory)) return [];

        RemoveOrphans();
        var backups = new List<StoredBackup>();
        foreach (var infoPath in Directory.EnumerateFiles(directory, $"*{InfoSuffix}"))
        {
            var name = Path.GetFileName(infoPath)[..^InfoSuffix.Length];
            if (Guid.TryParse(name, out var id) && await FindAsync(id, cancellationToken) is { } backup)
            {
                backups.Add(backup);
            }
        }

        return backups.OrderByDescending(b => b.CreatedAt).ToList();
    }

    public async Task<StoredBackup?> FindAsync(Guid id, CancellationToken cancellationToken)
    {
        if (DataPath(id) is not { } path || !File.Exists(InfoPath(id))) return null;

        try
        {
            await using var stream = File.OpenRead(InfoPath(id));
            var backup = await JsonSerializer.DeserializeAsync<StoredBackup>(stream, JsonOptions, cancellationToken);
            return backup is null
                ? null
                : backup with { Id = id, SizeBytes = new FileInfo(path).Length, IsArchive = path.EndsWith(ArchiveSuffix, StringComparison.Ordinal) };
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public async Task<StoredBackup> AddAsync(
        Guid id,
        Func<Stream, Task<StoredBackup>> write,
        CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(directory);
        var temporary = Path.Combine(directory, $"{id:N}{TemporarySuffix}");

        try
        {
            StoredBackup backup;
            await using (var stream = File.Create(temporary))
            {
                backup = await write(stream);
            }

            var path = Path.Combine(directory, $"{id:N}{(await IsArchiveAsync(temporary, cancellationToken) ? ArchiveSuffix : DocumentSuffix)}");
            File.Move(temporary, path);
            try
            {
                await SaveAsync(backup, cancellationToken);
            }
            catch
            {
                File.Delete(path);
                File.Delete(InfoPath(id));
                throw;
            }

            return backup with { SizeBytes = new FileInfo(path).Length, IsArchive = path.EndsWith(ArchiveSuffix, StringComparison.Ordinal) };
        }
        finally
        {
            File.Delete(temporary);
        }
    }

    public async Task SaveAsync(StoredBackup backup, CancellationToken cancellationToken)
    {
        await using var stream = File.Create(InfoPath(backup.Id));
        await JsonSerializer.SerializeAsync(stream, backup with { SizeBytes = 0 }, JsonOptions, cancellationToken);
    }

    public Stream OpenRead(Guid id) => File.OpenRead(DataPath(id) ?? throw new FileNotFoundException("The backup file is gone."));

    public void Delete(Guid id)
    {
        File.Delete(InfoPath(id));
        File.Delete(Path.Combine(directory, $"{id:N}{ArchiveSuffix}"));
        File.Delete(Path.Combine(directory, $"{id:N}{DocumentSuffix}"));
    }

    public int RemoveOrphans()
    {
        if (!Directory.Exists(directory)) return 0;

        var cutoff = clock.UtcNow.UtcDateTime - OrphanAge;
        var orphans = Directory.EnumerateFiles(directory, $"*{TemporarySuffix}")
            .Concat(DataFilesWithoutInfo(DocumentSuffix))
            .Concat(DataFilesWithoutInfo(ArchiveSuffix))
            .Where(path => File.GetLastWriteTimeUtc(path) < cutoff)
            .ToList();

        foreach (var orphan in orphans)
        {
            File.Delete(orphan);
        }

        return orphans.Count;
    }

    private IEnumerable<string> DataFilesWithoutInfo(string suffix) =>
        Directory.EnumerateFiles(directory, $"*{suffix}")
            .Where(data => !File.Exists(string.Concat(data.AsSpan(0, data.Length - suffix.Length), InfoSuffix)));

    private static async Task<bool> IsArchiveAsync(string path, CancellationToken cancellationToken)
    {
        var magic = new byte[4];
        await using var stream = File.OpenRead(path);
        var read = await stream.ReadAtLeastAsync(magic, magic.Length, throwOnEndOfStream: false, cancellationToken);
        return read == magic.Length && magic is [0x50, 0x4B, 0x03, 0x04];
    }

    private string? DataPath(Guid id)
    {
        var archive = Path.Combine(directory, $"{id:N}{ArchiveSuffix}");
        if (File.Exists(archive)) return archive;

        var document = Path.Combine(directory, $"{id:N}{DocumentSuffix}");
        return File.Exists(document) ? document : null;
    }

    private string InfoPath(Guid id) => Path.Combine(directory, $"{id:N}{InfoSuffix}");
}
