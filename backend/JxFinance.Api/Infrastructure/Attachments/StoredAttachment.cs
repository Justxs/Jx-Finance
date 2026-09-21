namespace JxFinance.Infrastructure.Attachments;

public sealed record StoredAttachment(string Path, long SizeBytes, string Sha256);
