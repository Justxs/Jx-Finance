using JxFinance.Domain.Common;

namespace JxFinance.Domain.Email;

public sealed class EmailMessage : OutboxMessage
{
    public const int AddressMaxLength = 320;
    public const int NameMaxLength = 200;
    public const int SubjectMaxLength = 200;
    public const int BodyMaxLength = 4000;

    public EmailKind Kind { get; set; }
    public string ToAddress { get; set; } = string.Empty;
    public string ToName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}
