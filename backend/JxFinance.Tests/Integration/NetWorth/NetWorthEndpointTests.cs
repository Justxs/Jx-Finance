using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.NetWorth;

[Collection(IntegrationCollection.Name)]
public sealed class NetWorthEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Net_worth_combines_accounts_assets_and_debts()
    {
        var appTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Vilnius");
        var today = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, appTimeZone).ToString("yyyy-MM-dd");

        var before = await Client.GetFromJsonAsync<NetWorthDto>("/api/networth");

        var assetResponse = await Client.PostAsJsonAsync(
            "/api/assets",
            new { name = $"Car {Guid.NewGuid():N}", type = "vehicle", currentValue = "10000.00", asOf = today });
        Assert.Equal(HttpStatusCode.Created, assetResponse.StatusCode);
        var asset = await assetResponse.Content.ReadFromJsonAsync<AssetDto>();

        var debtResponse = await Client.PostAsJsonAsync(
            "/api/debts",
            new { name = $"Car loan {Guid.NewGuid():N}", type = "loan", outstandingAmount = "4000.00", asOf = today });
        Assert.Equal(HttpStatusCode.Created, debtResponse.StatusCode);
        var debt = await debtResponse.Content.ReadFromJsonAsync<DebtDto>();

        var after = await Client.GetFromJsonAsync<NetWorthDto>("/api/networth");
        var expected = decimal.Parse(before!.NetWorth) + 10000.00m - 4000.00m;
        Assert.Equal(expected, decimal.Parse(after!.NetWorth));

        var history = await Client.GetFromJsonAsync<NetWorthHistoryDto>("/api/networth/history");
        Assert.Contains(history!.Items, i => i.Date == DateOnly.Parse(today, CultureInfo.InvariantCulture));

        await Client.DeleteAsync($"/api/assets/{asset!.Id}");
        await Client.DeleteAsync($"/api/debts/{debt!.Id}");
    }

    private sealed record AssetDto(Guid Id);

    private sealed record DebtDto(Guid Id);

    private sealed record NetWorthDto(string Accounts, string Assets, string Debts, string NetWorth);

    private sealed record NetWorthSnapshotItemDto(DateOnly Date, string NetWorth);

    private sealed record NetWorthHistoryDto(List<NetWorthSnapshotItemDto> Items);
}
