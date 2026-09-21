using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Attachments.Interfaces;
using JxFinance.Endpoints.Attachments.Shared;

namespace JxFinance.Endpoints.Attachments.GetAttachments;

public sealed class GetAttachmentsEndpoint(IAttachmentService attachmentService)
    : EndpointWithoutRequest<IReadOnlyList<AttachmentResponse>>
{
    public override void Configure()
    {
        Get("transactions/{transactionId}/attachments");
        Group<AttachmentsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var attachments = (await attachmentService.GetAllAsync(Route<Guid>("transactionId"), ct)).ValueOrThrow();
        await Send.OkAsync(attachments, ct);
    }
}
