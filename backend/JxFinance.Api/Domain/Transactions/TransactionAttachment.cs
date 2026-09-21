using JxFinance.Domain.Common;

namespace JxFinance.Domain.Transactions;

public sealed class TransactionAttachment : OwnableEntity
{
    public const long MaxFileBytes = 10L * 1024 * 1024;
    public const int MaxPerTransaction = 10;
    public const int FileNameMaxLength = 120;
    public const int ContentTypeMaxLength = 60;
    public const int Sha256Length = 64;

    public TransactionAttachmentId Id { get; set; } = TransactionAttachmentId.New();
    public TransactionId TransactionId { get; set; }
    public required string FileName { get; set; }
    public required string ContentType { get; set; }
    public long SizeBytes { get; set; }
    public required string Sha256 { get; set; }
}
