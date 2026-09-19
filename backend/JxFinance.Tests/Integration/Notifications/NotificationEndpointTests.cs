using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.Notifications;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Notifications;

[Collection<IntegrationCollection>]
public sealed class NotificationEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Unread_filter_and_mark_read_work_correctly()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        var notification = await SeedNotificationAsync(user);

        var unread = await client.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unread=true");
        Assert.Contains(unread!, n => n.Id == notification.Id.Value);

        var markResponse = await client.PatchAsync($"/api/notifications/{notification.Id.Value}/read", null);
        Assert.Equal(HttpStatusCode.NoContent, markResponse.StatusCode);

        var unreadAfter = await client.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unread=true");
        Assert.DoesNotContain(unreadAfter!, n => n.Id == notification.Id.Value);

        var all = await client.GetFromJsonAsync<List<NotificationDto>>("/api/notifications");
        Assert.Contains(all!, n => n.Id == notification.Id.Value && n.IsRead);
    }

    [Fact]
    public async Task Mark_all_read_clears_every_unread_notification()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        await SeedNotificationAsync(user);
        await SeedNotificationAsync(user);

        var markAllResponse = await client.PostAsync("/api/notifications/read-all", null);
        Assert.Equal(HttpStatusCode.NoContent, markAllResponse.StatusCode);

        var unread = await client.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unread=true");
        Assert.Empty(unread!);
    }

    [Fact]
    public async Task Mark_read_on_an_unknown_notification_returns_not_found()
    {
        var response = await Client.PatchAsync($"/api/notifications/{Guid.NewGuid()}/read", null);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private async Task<Notification> SeedNotificationAsync(TestUser user)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var notification = new Notification
        {
            UserId = user.Id,
            Type = NotificationType.BillDue,
            Title = $"Test bill due {Guid.NewGuid():N}",
            Message = "A test bill is due soon.",
            RelatedType = "RecurringBill",
            RelatedId = Guid.NewGuid(),
            Channel = NotificationChannel.InApp,
        };
        db.Notifications.Add(notification);
        await db.SaveChangesAsync();

        return notification;
    }

    private sealed record NotificationDto(Guid Id, bool IsRead);
}
