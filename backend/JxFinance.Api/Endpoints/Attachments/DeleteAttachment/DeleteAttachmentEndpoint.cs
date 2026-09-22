using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Attachments.Interfaces;

namespace JxFinance.Endpoints.Attachments.DeleteAttachment;

public sealed class DeleteAttachmentEndpoint(IAttachmentService attachmentService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Attachments + "/{id}");
        Group<AttachmentsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        attachmentService.DeleteAsync(id, ct);
}
