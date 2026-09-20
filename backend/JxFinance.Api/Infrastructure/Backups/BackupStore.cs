using System.Text.Json;

namespace JxFinance.Infrastructure.Backups;

public sealed class BackupStore(IConfiguration configuration, IHostEnvironment environment)
{
    private const string DataSuffix = ".json.gz";
    private const string InfoSuffix = ".info.json";
    private const string TemporarySuffix = ".tmp";

    private static readonly TimeSpan OrphanAge = TimeSpan.FromHours(1);

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly string directory = string.IsNullOrWhiteSpace(configuration["App:BackupDirectory"])
        ? Path.Combine(environment.ContentRootPath, "backups")
        : configuration["App:BackupDirectory"]!;

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
        var data = new FileInfo(DataPath(id));
        if (!data.Exists || !File.Exists(InfoPath(id))) return null;

        try
        {
            await using var stream = File.OpenRead(InfoPath(id));
            var backup = await JsonSerializer.DeserializeAsync<StoredBackup>(stream, JsonOptions, cancellationToken);
            return backup is null ? null : backup with { Id = id, SizeBytes = data.Length };
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

            File.Move(temporary, DataPath(id));
            try
            {
                await SaveAsync(backup, cancellationToken);
            }
            catch
            {
                File.Delete(DataPath(id));
                File.Delete(InfoPath(id));
                throw;
            }

            return backup with { SizeBytes = new FileInfo(DataPath(id)).Length };
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

    public Stream OpenRead(Guid id) => File.OpenRead(DataPath(id));

    public void Delete(Guid id)
    {
        File.Delete(InfoPath(id));
        File.Delete(DataPath(id));
    }

    public int RemoveOrphans()
    {
        if (!Directory.Exists(directory)) return 0;

        var cutoff = DateTime.UtcNow - OrphanAge;
        var orphans = Directory.EnumerateFiles(directory, $"*{TemporarySuffix}")
            .Concat(Directory.EnumerateFiles(directory, $"*{DataSuffix}")
                .Where(data => !File.Exists(string.Concat(data.AsSpan(0, data.Length - DataSuffix.Length), InfoSuffix))))
            .Where(path => File.GetLastWriteTimeUtc(path) < cutoff)
            .ToList();

        foreach (var orphan in orphans)
        {
            File.Delete(orphan);
        }

        return orphans.Count;
    }

    private string DataPath(Guid id) => Path.Combine(directory, $"{id:N}{DataSuffix}");

    private string InfoPath(Guid id) => Path.Combine(directory, $"{id:N}{InfoSuffix}");
}
