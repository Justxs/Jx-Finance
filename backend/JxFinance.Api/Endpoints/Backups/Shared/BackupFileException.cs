using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Backups.Shared;

public sealed class BackupFileException : Exception
{
    public BackupFileException()
        : this("The file is not a Jx Finance backup.")
    {
    }

    public BackupFileException(string message)
        : base(message)
    {
    }

    public BackupFileException(string message, Exception innerException)
        : base(message, innerException)
    {
    }

    public BackupFileException(string code, string message)
        : base(message)
    {
        Code = code;
    }

    public string Code { get; } = ErrorCodes.BackupInvalidFile;
}
