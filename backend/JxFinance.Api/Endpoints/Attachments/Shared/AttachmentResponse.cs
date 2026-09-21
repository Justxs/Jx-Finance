namespace JxFinance.Endpoints.Attachments.Shared;

public sealed record AttachmentResponse(
    Guid Id,
    Guid TransactionId,
    string FileName,
    string ContentType,
    long SizeBytes,
    string Sha256,
    Guid UploadedById,
    string UploadedByName,
    DateTimeOffset UploadedAt);
