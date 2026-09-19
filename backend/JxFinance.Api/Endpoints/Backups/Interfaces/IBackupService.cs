using JxFinance.Domain.Common;
using JxFinance.Endpoints.Backups.RestoreBackup;
using JxFinance.Endpoints.Backups.Shared;

namespace JxFinance.Endpoints.Backups.Interfaces;

public interface IBackupService
{
    Task<IReadOnlyList<BackupResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<BackupResponse> CreateAsync(string? note, CancellationToken cancellationToken);

    Task<Result<BackupResponse>> UploadAsync(Stream input, string? note, CancellationToken cancellationToken);

    Task<Result<BackupResponse>> UpdateAsync(Guid id, string? note, CancellationToken cancellationToken);

    Task<Result<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<BackupDownload>> OpenAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<RestoreBackupResponse>> RestoreAsync(Guid id, CancellationToken cancellationToken);
}
