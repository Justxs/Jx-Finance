using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Attachments.Interfaces;
using JxFinance.Endpoints.Attachments.Shared;

namespace JxFinance.Endpoints.Attachments.SetAttachmentWarranty;

public sealed class SetAttachmentWarrantyEndpoint(IAttachmentService attachmentService)
    : Endpoint<SetAttachmentWarrantyRequest, AttachmentResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Attachments + "/{id}/warranty");
        Group<AttachmentsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(SetAttachmentWarrantyRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await attachmentService.SetWarrantyAsync(req.Id, req.WarrantyUntil, ct), ct);
}
