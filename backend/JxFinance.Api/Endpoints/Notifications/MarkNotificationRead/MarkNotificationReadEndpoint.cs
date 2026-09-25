using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Notifications.Interfaces;

namespace JxFinance.Endpoints.Notifications.MarkNotificationRead;

public sealed class MarkNotificationReadEndpoint(INotificationService notificationService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Patch(ApiRoutes.Notifications + "/{id}/read");
        Group<NotificationsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await notificationService.MarkReadAsync(Route<Guid>("id"), ct), ct);
}
