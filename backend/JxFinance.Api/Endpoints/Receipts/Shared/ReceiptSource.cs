using JxFinance.Endpoints.Attachments.Shared;

namespace JxFinance.Endpoints.Receipts.Shared;

public sealed record ReceiptSource(Guid? AttachmentId, AttachmentUpload? Upload, bool Force);
