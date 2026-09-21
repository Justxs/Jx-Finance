namespace JxFinance.Infrastructure.Attachments;

public sealed class AttachmentTooLargeException : IOException
{
    public AttachmentTooLargeException()
    {
    }

    public AttachmentTooLargeException(string message)
        : base(message)
    {
    }

    public AttachmentTooLargeException(string message, Exception innerException)
        : base(message, innerException)
    {
    }

    public AttachmentTooLargeException(long maximumBytes)
        : base($"The file holds more than {maximumBytes} bytes.")
    {
    }
}
