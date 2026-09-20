using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.Services;

public sealed class BackupInspector : IBackupVisitor
{
    public BackupHeader? Header { get; private set; }

    public int Tables { get; private set; }

    public long Rows { get; private set; }

    public Task BeginAsync(BackupHeader header, CancellationToken cancellationToken)
    {
        BackupService.EnsureSupported(header);
        Header = header;
        return Task.CompletedTask;
    }

    public Task BeginTableAsync(string name, IReadOnlyList<string> columns, CancellationToken cancellationToken)
    {
        Tables++;
        return Task.CompletedTask;
    }

    public Task RowAsync(IReadOnlyList<string?> row, CancellationToken cancellationToken)
    {
        Rows++;
        return Task.CompletedTask;
    }

    public Task EndTableAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
