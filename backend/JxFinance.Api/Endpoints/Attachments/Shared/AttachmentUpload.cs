namespace JxFinance.Endpoints.Attachments.Shared;

public sealed record AttachmentUpload(Stream Content, string? FileName, string? ContentType, long Length);
