using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.Interfaces;

public interface IBackupVisitor
{
    Task BeginAsync(BackupHeader header, CancellationToken cancellationToken);

    Task BeginTableAsync(string name, IReadOnlyList<string> columns, CancellationToken cancellationToken);

    Task RowAsync(IReadOnlyList<string?> row, CancellationToken cancellationToken);

    Task EndTableAsync(CancellationToken cancellationToken);
}
