namespace JxFinance.Infrastructure.Attachments;

public sealed class AttachmentStaging(AttachmentStore store, string directory) : IDisposable
{
    private readonly List<Guid> staged = [];

    public IReadOnlyList<Guid> Staged => staged;

    public async Task<StoredAttachment> AddAsync(Guid id, Stream content, long maximumBytes, CancellationToken cancellationToken)
    {
        var path = Path.Combine(directory, id.ToString("N"));
        StoredAttachment stored;
        await using (var output = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        {
            stored = await AttachmentStore.CopyAsync(content, output, path, maximumBytes, cancellationToken);
        }

        staged.Add(id);
        return stored;
    }

    public int Publish()
    {
        foreach (var id in staged)
        {
            File.Move(Path.Combine(directory, id.ToString("N")), store.PathOf(id), overwrite: true);
        }

        return staged.Count;
    }

    public void Dispose()
    {
        if (Directory.Exists(directory))
        {
            Directory.Delete(directory, recursive: true);
        }
    }
}
