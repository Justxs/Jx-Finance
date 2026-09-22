using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Attachments.Interfaces;
using JxFinance.Endpoints.Attachments.Shared;

namespace JxFinance.Endpoints.Attachments.GetAttachments;

public sealed class GetAttachmentsEndpoint(IAttachmentService attachmentService)
    : EndpointWithoutRequest<IReadOnlyList<AttachmentResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Transactions + "/{transactionId}/attachments");
        Group<AttachmentsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkOrProblemAsync(await attachmentService.GetAllAsync(Route<Guid>("transactionId"), ct), ct);
    }
}
