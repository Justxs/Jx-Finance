namespace JxFinance.Endpoints.Backups.Shared;

public sealed record BackupDownload(Stream Content, string FileName, long SizeBytes);
