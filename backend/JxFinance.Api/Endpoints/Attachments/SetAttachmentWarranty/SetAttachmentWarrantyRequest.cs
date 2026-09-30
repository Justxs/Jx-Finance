namespace JxFinance.Endpoints.Attachments.SetAttachmentWarranty;

public sealed record SetAttachmentWarrantyRequest(Guid Id, DateOnly? WarrantyUntil);
