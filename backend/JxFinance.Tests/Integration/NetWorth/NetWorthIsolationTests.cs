using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.NetWorth;

[Collection<IntegrationCollection>]
public sealed class NetWorthIsolationTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Each_user_has_one_history_point_per_day_that_follows_the_latest_view()
    {
        using var first = await CreateUserClientAsync();
        using var second = await CreateUserClientAsync();
        await CreateAccountAsync("100.00", client: first);
        await CreateAccountAsync("7.00", client: second);

        await first.GetAsync("/api/networth");
        await second.GetAsync("/api/networth");
        await PostAsync<IdDto>(first, "/api/assets", new { name = "Bike", type = "vehicle", currentValue = "400.00", asOf = Today });
        await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => first.GetAsync("/api/networth")));

        var firstHistory = await first.GetFromJsonAsync<HistoryDto>("/api/networth/history");
        var secondHistory = await second.GetFromJsonAsync<HistoryDto>("/api/networth/history");

        Assert.Equal(new PointDto(Today, "100.00", "400.00", "0.00", "500.00"), Assert.Single(firstHistory!.Items));
        Assert.Equal(new PointDto(Today, "7.00", "0.00", "0.00", "7.00"), Assert.Single(secondHistory!.Items));
    }

    [Fact]
    public async Task Assets_and_debts_of_a_household_partner_stay_out_of_net_worth()
    {
        var owner = await CreateUserAsync();
        var partner = await CreateUserAsync();
        await CreateHouseholdAsync(owner, partner);
        using var ownerClient = await LoginAsync(owner);
        using var partnerClient = await LoginAsync(partner);
        var asset = await PostAsync<IdDto>(ownerClient, "/api/assets", new { name = "Flat", type = "property", currentValue = "90000.00", asOf = Today });
        var debt = await PostAsync<IdDto>(ownerClient, "/api/debts", new { name = "Mortgage", type = "loan", outstandingAmount = "60000.00", asOf = Today });

        var partnerWorth = await partnerClient.GetFromJsonAsync<NetWorthDto>("/api/networth");
        var updateAsset = await partnerClient.PutAsJsonAsync($"/api/assets/{asset.Id}", new { name = "Mine now", type = "property", currentValue = "1.00", asOf = Today });
        var updateDebt = await partnerClient.PutAsJsonAsync($"/api/debts/{debt.Id}", new { name = "Mine now", type = "loan", outstandingAmount = "1.00", asOf = Today });

        Assert.Equal(new NetWorthDto("0.00", "0.00", "0.00", "0.00"), partnerWorth);
        Assert.Empty((await partnerClient.GetFromJsonAsync<List<IdDto>>("/api/assets"))!);
        Assert.Empty((await partnerClient.GetFromJsonAsync<List<IdDto>>("/api/debts"))!);
        Assert.Equal(HttpStatusCode.NotFound, updateAsset.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, updateDebt.StatusCode);
        Assert.Equal(new NetWorthDto("0.00", "90000.00", "60000.00", "30000.00"), await ownerClient.GetFromJsonAsync<NetWorthDto>("/api/networth"));
    }

    [Fact]
    public async Task A_shared_account_counts_in_the_net_worth_of_every_member()
    {
        var owner = await CreateUserAsync();
        var partner = await CreateUserAsync();
        var household = await CreateHouseholdAsync(owner, partner);
        using var ownerClient = await LoginAsync(owner);
        using var partnerClient = await LoginAsync(partner);
        await CreateAccountAsync("250.00", householdId: household, client: ownerClient);
        await CreateAccountAsync("40.00", client: ownerClient);

        Assert.Equal("290.00", (await ownerClient.GetFromJsonAsync<NetWorthDto>("/api/networth"))!.Accounts);
        Assert.Equal("250.00", (await partnerClient.GetFromJsonAsync<NetWorthDto>("/api/networth"))!.Accounts);
    }

    [Fact]
    public async Task Deleting_an_asset_or_a_debt_takes_it_out_of_net_worth()
    {
        using var member = await CreateUserClientAsync();
        var asset = await PostAsync<IdDto>(member, "/api/assets", new { name = "Watch", type = "valuable", currentValue = "300.00", asOf = Today });
        var debt = await PostAsync<IdDto>(member, "/api/debts", new { name = "Card", type = "loan", outstandingAmount = "120.00", asOf = Today });
        Assert.Equal("180.00", (await member.GetFromJsonAsync<NetWorthDto>("/api/networth"))!.NetWorth);

        Assert.Equal(HttpStatusCode.NoContent, (await member.DeleteAsync($"/api/assets/{asset.Id}")).StatusCode);
        Assert.Equal("-120.00", (await member.GetFromJsonAsync<NetWorthDto>("/api/networth"))!.NetWorth);
        Assert.Equal(HttpStatusCode.NoContent, (await member.DeleteAsync($"/api/debts/{debt.Id}")).StatusCode);

        Assert.Equal("0.00", (await member.GetFromJsonAsync<NetWorthDto>("/api/networth"))!.NetWorth);
        Assert.Equal("0.00", Assert.Single((await member.GetFromJsonAsync<HistoryDto>("/api/networth/history"))!.Items).NetWorth);
    }

    [Theory]
    [InlineData("assets", "name", "")]
    [InlineData("assets", "type", "spaceship")]
    [InlineData("assets", "currentValue", null)]
    [InlineData("assets", "currentValue", "10000000000000000.00")]
    [InlineData("assets", "asOf", null)]
    [InlineData("debts", "name", "")]
    [InlineData("debts", "type", "favour")]
    [InlineData("debts", "outstandingAmount", null)]
    [InlineData("debts", "outstandingAmount", "0.001")]
    [InlineData("debts", "asOf", null)]
    public async Task Update_rejects_an_invalid_value_and_keeps_the_record(string resource, string field, string? value)
    {
        using var member = await CreateUserClientAsync();
        var valid = new Dictionary<string, object?>
        {
            ["name"] = "Valid",
            ["type"] = resource == "assets" ? "vehicle" : "loan",
            ["currentValue"] = "10.00",
            ["outstandingAmount"] = "10.00",
            ["asOf"] = Today,
        };
        var created = await PostAsync<IdDto>(member, $"/api/{resource}", valid);
        var invalid = new Dictionary<string, object?>(valid) { [field] = value };

        var response = await member.PutAsJsonAsync($"/api/{resource}/{created.Id}", invalid);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var stored = await member.GetStringAsync($"/api/{resource}");
        Assert.Contains("\"Valid\"", stored);
        Assert.Contains("\"10.00\"", stored);
    }

    private sealed record NetWorthDto(string Accounts, string Assets, string Debts, string NetWorth);

    private sealed record PointDto(DateOnly Date, string Accounts, string Assets, string Debts, string NetWorth);

    private sealed record HistoryDto(List<PointDto> Items);
}
