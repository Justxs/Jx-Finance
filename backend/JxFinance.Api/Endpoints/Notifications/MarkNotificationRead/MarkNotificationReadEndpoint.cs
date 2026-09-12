using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Notifications.Interfaces;

namespace JxFinance.Endpoints.Notifications.MarkNotificationRead;

public sealed class MarkNotificationReadEndpoint(INotificationService notificationService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Patch("notifications/{id}/read");
        Group<NotificationsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await notificationService.MarkReadAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
