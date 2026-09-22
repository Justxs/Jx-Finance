using System.Security.Cryptography;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Configuration;

namespace JxFinance.Infrastructure.Attachments;

public sealed class AttachmentStore(IConfiguration configuration, IHostEnvironment environment, IClock clock)
{
    private const string TemporarySuffix = ".tmp";
    private const string StagingPrefix = ".restore-";
    private const int CopyBufferBytes = 81920;

    private static readonly TimeSpan OrphanAge = TimeSpan.FromHours(1);

    private readonly string directory = string.IsNullOrWhiteSpace(configuration[ConfigKeys.AttachmentDirectory])
        ? Path.Combine(environment.ContentRootPath, "attachments")
        : configuration[ConfigKeys.AttachmentDirectory]!;

    public async Task<StoredAttachment> WriteTemporaryAsync(Stream content, long maximumBytes, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, $"{Guid.NewGuid():N}{TemporarySuffix}");
        try
        {
            await using var output = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, CopyBufferBytes, useAsync: true);
            return await CopyAsync(content, output, path, maximumBytes, cancellationToken);
        }
        catch
        {
            File.Delete(path);
            throw;
        }
    }

    public void Keep(StoredAttachment temporary, Guid id) => File.Move(temporary.Path, PathOf(id), overwrite: true);

    public void Discard(StoredAttachment temporary) => File.Delete(temporary.Path);

    public bool Exists(Guid id) => File.Exists(PathOf(id));

    public Stream OpenRead(Guid id) =>
        new FileStream(PathOf(id), FileMode.Open, FileAccess.Read, FileShare.Read, CopyBufferBytes, useAsync: true);

    public void Delete(Guid id) => File.Delete(PathOf(id));

    public AttachmentStaging BeginStaging()
    {
        var staging = Path.Combine(directory, $"{StagingPrefix}{Guid.NewGuid():N}");
        Directory.CreateDirectory(staging);
        return new AttachmentStaging(this, staging);
    }

    public int RemoveOrphans(IReadOnlySet<Guid> known)
    {
        if (!Directory.Exists(directory))
        {
            return 0;
        }

        var cutoff = clock.UtcNow.UtcDateTime - OrphanAge;
        var removed = 0;
        foreach (var path in Directory.EnumerateFiles(directory).ToList())
        {
            var name = Path.GetFileName(path);
            var stale = name.EndsWith(TemporarySuffix, StringComparison.Ordinal)
                || (Guid.TryParseExact(name, "N", out var id) && !known.Contains(id));
            if (stale && File.GetLastWriteTimeUtc(path) < cutoff)
            {
                File.Delete(path);
                removed++;
            }
        }

        foreach (var staging in Directory.EnumerateDirectories(directory, $"{StagingPrefix}*").ToList())
        {
            if (Directory.GetLastWriteTimeUtc(staging) < cutoff)
            {
                Directory.Delete(staging, recursive: true);
                removed++;
            }
        }

        return removed;
    }

    internal static async Task<StoredAttachment> CopyAsync(
        Stream content,
        Stream output,
        string path,
        long maximumBytes,
        CancellationToken cancellationToken)
    {
        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        var buffer = new byte[CopyBufferBytes];
        long total = 0;
        int read;
        while ((read = await content.ReadAsync(buffer, cancellationToken)) > 0)
        {
            total += read;
            if (total > maximumBytes)
            {
                throw new AttachmentTooLargeException(maximumBytes);
            }

            hash.AppendData(buffer, 0, read);
            await output.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
        }

        return new StoredAttachment(path, total, Convert.ToHexStringLower(hash.GetHashAndReset()));
    }

    internal string PathOf(Guid id) => Path.Combine(directory, id.ToString("N"));
}
