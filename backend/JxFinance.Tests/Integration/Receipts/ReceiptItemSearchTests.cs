using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Receipts;

[Collection<IntegrationCollection>]
public sealed class ReceiptItemSearchTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task An_item_name_finds_the_purchase_in_the_ledger_the_list_the_summary_and_the_export()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await CreateAccountAsync("1000.00", client: member);
        var vacuum = await CreateTransactionAsync(member, account, null, "expense", "349.00", "2026-09-12", "SENUKAI");
        await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-09-13", "Maxima");
        var receipt = await UploadAsync(member, vacuum.Id, 1);
        await ReadAsync(user.Id, receipt.Sha256, "Pirkinių maišelis", "DYSON V8 dulkių siurblys");
        var warranty = await member.PutAsJsonAsync($"/api/attachments/{receipt.Id}/warranty", new { warrantyUntil = "2028-09-12" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, warranty.StatusCode);

        var ledger = await LedgerAsync(member, "search=dyson");
        var list = await member.GetFromJsonAsync<PageDto<FoundDto>>("/api/transactions?search=DYSON%20v8", TestContext.Current.CancellationToken);
        var summary = await member.GetFromJsonAsync<SummaryDto>("/api/transactions/summary?search=dyson", TestContext.Current.CancellationToken);
        var csv = await member.GetStringAsync("/api/transactions/export?search=dyson", TestContext.Current.CancellationToken);
        var byShop = await LedgerAsync(member, "search=senukai");

        var found = Assert.Single(ledger.Items).Transaction!;
        Assert.Equal((vacuum.Id, "DYSON V8 dulkių siurblys", new DateOnly(2028, 9, 12)), (found.Id, found.ReceiptItem?.Name, found.ReceiptItem?.WarrantyUntil));
        Assert.Equal("DYSON V8 dulkių siurblys", Assert.Single(list!.Items).ReceiptItem?.Name);
        Assert.Equal((1, "349.00"), (summary!.Count, summary.TotalExpense));
        var row = Assert.Single(csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Skip(1));
        Assert.StartsWith("2026-09-12,SENUKAI,", row, StringComparison.Ordinal);
        Assert.Null(Assert.Single(byShop.Items).Transaction!.ReceiptItem);
    }

    [Fact]
    public async Task Only_the_callers_own_readings_of_files_still_attached_count_while_the_switch_is_on()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("1000.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var purchase = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "89.00", "2026-09-20", "Varle");
        var receipt = await UploadAsync(pair.OwnerClient, purchase.Id, 2);
        await ReadAsync(pair.Owner.Id, receipt.Sha256, "Philips trimmer");

        var partner = await LedgerAsync(pair.PartnerClient, "search=trimmer");
        var owner = await LedgerAsync(pair.OwnerClient, "search=trimmer");
        PageDto<LedgerDto> switchedOff;
        await using (await FeatureOffAsync("receiptReading"))
        {
            switchedOff = await LedgerAsync(pair.OwnerClient, "search=trimmer");
        }

        var deleted = await pair.OwnerClient.DeleteAsync($"/api/attachments/{receipt.Id}", TestContext.Current.CancellationToken);
        var afterDelete = await LedgerAsync(pair.OwnerClient, "search=trimmer");

        Assert.Empty(partner.Items);
        Assert.Single(owner.Items);
        Assert.Empty(switchedOff.Items);
        Assert.True(deleted.IsSuccessStatusCode);
        Assert.Empty(afterDelete.Items);
    }

    private static async Task<PageDto<LedgerDto>> LedgerAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<PageDto<LedgerDto>>($"/api/transactions/ledger?pageSize=50&{query}", TestContext.Current.CancellationToken))!;

    private async Task ReadAsync(Guid userId, string sha256, params string[] names) =>
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
                    [.. names.Select(name => new ReceiptItem(name, null, 10m, 0m, 0m))],
                    [],
                    []),
            });
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });

    private static async Task<UploadedDto> UploadAsync(HttpClient client, Guid transactionId, byte marker)
    {
        using var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(SamplePhoto.Png(marker));
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(file, "file", "receipt.png");
        var response = await client.PostAsync($"/api/transactions/{transactionId}/attachments", content, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<UploadedDto>(TestContext.Current.CancellationToken))!;
    }

    private sealed record UploadedDto(Guid Id, string Sha256);

    private sealed record ReceiptItemDto(string Name, DateOnly? WarrantyUntil);

    private sealed record FoundDto(Guid Id, string? Description, ReceiptItemDto? ReceiptItem);

    private sealed record LedgerDto(string Kind, FoundDto? Transaction);

    private sealed record SummaryDto(int Count, string TotalIncome, string TotalExpense);
}
