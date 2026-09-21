namespace JxFinance.Endpoints.Attachments.Shared;

public sealed record AttachmentDownload(Stream Content, string FileName, string ContentType, long SizeBytes, string Sha256);
