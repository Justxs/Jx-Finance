using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Imports;

public sealed class ImportInboxFolder(string? directory, IClock clock)
{
    public const string DoneFolder = "done";
    public const string FailedFolder = "failed";
    public const string ReasonSuffix = ".reason.txt";
    public const int ListedFailures = 20;

    public static readonly TimeSpan SettleTime = TimeSpan.FromMinutes(1);

    public string? Directory { get; } = string.IsNullOrWhiteSpace(directory) ? null : Path.GetFullPath(directory);

    public IReadOnlyList<InboxEntry> Ready()
    {
        if (Directory is null || !System.IO.Directory.Exists(Directory))
        {
            return [];
        }

        var settled = (clock.UtcNow - SettleTime).UtcDateTime;
        var root = new DirectoryInfo(Directory);
        var folders = root.EnumerateDirectories()
            .Where(folder => !IsSkipped(folder.Name) && folder.Name is not (DoneFolder or FailedFolder));
        return Entries(root, null)
            .Concat(folders.SelectMany(folder => Entries(folder, folder.Name)))
            .Where(entry => entry.File.LastWriteTimeUtc <= settled)
            .OrderBy(entry => entry.File.LastWriteTimeUtc)
            .ToList();
    }

    public void Done(InboxEntry entry) => MoveTo(entry, DoneFolder);

    public void Fail(InboxEntry entry, string reason) =>
        File.WriteAllText(MoveTo(entry, FailedFolder) + ReasonSuffix, reason);

    public IReadOnlyList<InboxFailure> RecentFailures()
    {
        var failed = Directory is null ? null : new DirectoryInfo(Path.Combine(Directory, FailedFolder));
        if (failed is null || !failed.Exists)
        {
            return [];
        }

        return failed.EnumerateFiles($"*{ReasonSuffix}", SearchOption.AllDirectories)
            .OrderByDescending(reason => reason.LastWriteTimeUtc)
            .Take(ListedFailures)
            .Select(reason => new InboxFailure(
                Path.GetRelativePath(failed.FullName, reason.FullName)[..^ReasonSuffix.Length].Replace(Path.DirectorySeparatorChar, '/'),
                File.ReadAllText(reason.FullName).Trim(),
                new DateTimeOffset(reason.LastWriteTimeUtc, TimeSpan.Zero)))
            .ToList();
    }

    private string MoveTo(InboxEntry entry, string outcome)
    {
        var target = Path.Combine(Directory!, outcome, entry.Folder ?? string.Empty);
        System.IO.Directory.CreateDirectory(target);
        var path = Path.Combine(target, entry.File.Name);
        if (File.Exists(path) || File.Exists(path + ReasonSuffix))
        {
            path = Path.Combine(target, $"{Path.GetFileNameWithoutExtension(entry.File.Name)}-{Guid.NewGuid():N}{entry.File.Extension}");
        }

        entry.File.MoveTo(path);
        return path;
    }

    private static IEnumerable<InboxEntry> Entries(DirectoryInfo folder, string? name) =>
        folder.EnumerateFiles()
            .Where(file => !IsSkipped(file.Name))
            .Select(file => new InboxEntry(file, name));

    private static bool IsSkipped(string name) =>
        name.StartsWith('.') || name.StartsWith('~')
        || name.EndsWith(".tmp", StringComparison.OrdinalIgnoreCase)
        || name.EndsWith(".part", StringComparison.OrdinalIgnoreCase);
}

public sealed record InboxEntry(FileInfo File, string? Folder);

public sealed record InboxFailure(string FileName, string Reason, DateTimeOffset At);
