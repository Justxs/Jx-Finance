using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Receipts;

[Collection<IntegrationCollection>]
public sealed class ReceiptItemReportTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Items_of_read_receipts_add_up_by_name_within_the_range_and_can_be_searched()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await CreateAccountAsync("1000.00", client: member);
        var march = await CreateTransactionAsync(member, account, null, "expense", "10.00", "2026-03-02", "Maxima");
        var june = await CreateTransactionAsync(member, account, null, "expense", "8.00", "2026-06-10", "Rimi");
        var old = await CreateTransactionAsync(member, account, null, "expense", "5.00", "2025-12-30", "Iki");
        await ReadAsync(user.Id, await UploadAsync(member, march.Id, 1), ("Dantų pasta Colgate 75 ml", 3.49m, 0.50m), ("Duona", 1.20m, 0m));
        await ReadAsync(user.Id, await UploadAsync(member, june.Id, 2), ("DANTU PASTA colgate", 3.19m, 0m));
        await ReadAsync(user.Id, await UploadAsync(member, old.Id, 3), ("Dantų pasta Colgate", 9.99m, 0m));

        var all = await ItemsAsync(member, "dateFrom=2026-01-01&dateTo=2026-12-31");
        var searched = await ItemsAsync(member, "dateFrom=2026-01-01&dateTo=2026-12-31&search=pasta");

        var paste = all.Items[0];
        Assert.Equal(("dantu pasta colgate", "6.18", 2, new DateOnly(2026, 6, 10)), (paste.Key, paste.Amount, paste.Count, paste.LastBought));
        Assert.Equal(2, all.Receipts);
        Assert.Equal(["dantu pasta colgate"], searched.Items.Select(i => i.Key));
    }

    private static async Task<ItemsDto> ItemsAsync(HttpClient client, string query)
    {
        var response = await client.GetAsync($"/api/receipts/items?{query}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ItemsDto>(TestContext.Current.CancellationToken))!;
    }

    private async Task ReadAsync(Guid userId, string sha256, params (string Name, decimal Amount, decimal Discount)[] items) =>
        await WithDbAsync(async db =>
        {
            db.ReceiptReadings.Add(new ReceiptReading
            {
                UserId = userId,
                Sha256 = sha256,
                Status = ReceiptReadingStatus.Read,
                Result = new ReceiptResult(
                    "Shop",
                    null,
                    Currency.Eur,
                    null,
                    false,
                    1,
                    1,
                    [.. items.Select(item => new ReceiptItem(item.Name, null, item.Amount, item.Discount, 0m))],
                    [],
                    []),
            });
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });

    private static async Task<string> UploadAsync(HttpClient client, Guid transactionId, byte marker)
    {
        using var content = new MultipartFormDataContent();
        var file = new ByteArrayContent([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, marker, 2, 3]);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(file, "file", "receipt.png");
        var response = await client.PostAsync($"/api/transactions/{transactionId}/attachments", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<UploadedDto>(TestContext.Current.CancellationToken))!.Sha256;
    }

    private sealed record UploadedDto(string Sha256);

    private sealed record ItemDto(string Key, string Name, string Currency, string Amount, int Count, DateOnly LastBought);

    private sealed record ItemsDto(List<ItemDto> Items, int Receipts);
}
