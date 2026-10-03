using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using JxFinance.Domain.Notifications;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Notifications;

[Collection<NotificationsCollection>]
public sealed class WarrantyReminderTests(NotificationsFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_warranty_ending_within_thirty_days_is_announced_once_and_a_later_one_not_yet()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var laptop = await CreateTransactionAsync(member, account, null, "expense", "999.00", Iso(Today.AddYears(-2)), "Laptop");
        var phone = await CreateTransactionAsync(member, account, null, "expense", "499.00", Iso(Today.AddYears(-1)), "Phone");
        var laptopReceipt = await UploadAsync(member, laptop.Id);
        var phoneReceipt = await UploadAsync(member, phone.Id);

        var set = await member.PutAsJsonAsync($"/api/attachments/{laptopReceipt}/warranty", new { warrantyUntil = Iso(Today.AddDays(20)) }, TestContext.Current.CancellationToken);
        await member.PutAsJsonAsync($"/api/attachments/{phoneReceipt}/warranty", new { warrantyUntil = Iso(Today.AddDays(200)) }, TestContext.Current.CancellationToken);
        var job = Job<WarrantyReminderJob>();
        await job.RunOnceAsync(TestContext.Current.CancellationToken);
        await job.RunOnceAsync(TestContext.Current.CancellationToken);

        var shown = await ReadOkAsync<WarrantyAttachmentDto>(set);
        var alerts = (await member.GetFromJsonAsync<List<AlertDto>>("/api/notifications", TestContext.Current.CancellationToken))!
            .Where(n => n.RelatedType == NotificationRelated.Attachment)
            .ToList();

        Assert.Equal(Today.AddDays(20), shown.WarrantyUntil);
        var alert = Assert.Single(alerts);
        Assert.Equal(("warrantyExpiring", "Laptop", laptopReceipt), (alert.Type, alert.Title, alert.RelatedId));
    }

    private static string Iso(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static async Task<Guid> UploadAsync(HttpClient client, Guid transactionId)
    {
        using var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(SamplePhoto.Png(1));
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(file, "file", "receipt.png");
        var response = await client.PostAsync($"/api/transactions/{transactionId}/attachments", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<WarrantyAttachmentDto>(TestContext.Current.CancellationToken))!.Id;
    }

    private sealed record WarrantyAttachmentDto(Guid Id, DateOnly? WarrantyUntil);

    private sealed record AlertDto(string Type, string Title, string? RelatedType, Guid? RelatedId);
}
