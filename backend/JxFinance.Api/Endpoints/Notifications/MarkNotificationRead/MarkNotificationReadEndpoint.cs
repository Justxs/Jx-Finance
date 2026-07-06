using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Notifications.MarkNotificationRead;

public sealed class MarkNotificationReadEndpoint(INotificationService notificationService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Patch("/api/notifications/{id}/read");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await notificationService.MarkReadAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
