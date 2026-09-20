namespace JxFinance.Infrastructure.Backups;

public sealed class BackupTooLargeException : IOException
{
    public BackupTooLargeException()
    {
    }

    public BackupTooLargeException(string message)
        : base(message)
    {
    }

    public BackupTooLargeException(string message, Exception innerException)
        : base(message, innerException)
    {
    }

    public BackupTooLargeException(long maximumBytes)
        : base($"The stream holds more than {maximumBytes} bytes.")
    {
    }
}
