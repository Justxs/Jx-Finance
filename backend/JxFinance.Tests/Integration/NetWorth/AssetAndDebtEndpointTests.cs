using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.NetWorth;

[Collection<IntegrationCollection>]
public sealed class AssetAndDebtEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Revaluing_an_asset_changes_net_worth_by_the_difference()
    {
        using var member = await CreateUserClientAsync();
        var asset = await PostAsync<AssetDto>(
            member,
            "/api/assets",
            new { name = "Car", type = "vehicle", currentValue = "10000.00", asOf = Today });

        var update = await member.PutAsJsonAsync(
            $"/api/assets/{asset.Id}",
            new { name = "Car, one year on", type = "vehicle", currentValue = "8500.00", asOf = Today }, TestContext.Current.CancellationToken);

        update.EnsureSuccessStatusCode();
        var listed = Assert.Single((await member.GetFromJsonAsync<List<AssetDto>>("/api/assets", TestContext.Current.CancellationToken))!);
        Assert.Equal(new AssetDto(asset.Id, "Car, one year on", "8500.00"), listed);
        Assert.Equal("8500.00", (await member.GetFromJsonAsync<NetWorthDto>("/api/networth", TestContext.Current.CancellationToken))!.NetWorth);
    }

    [Fact]
    public async Task Paying_down_a_debt_raises_net_worth()
    {
        using var member = await CreateUserClientAsync();
        var debt = await PostAsync<DebtDto>(
            member,
            "/api/debts",
            new { name = "Loan", type = "loan", outstandingAmount = "4000.00", interestRate = 5.5m, asOf = Today });

        var update = await member.PutAsJsonAsync(
            $"/api/debts/{debt.Id}",
            new { name = "Loan", type = "loan", outstandingAmount = "2500.00", interestRate = 5.5m, asOf = Today }, TestContext.Current.CancellationToken);

        update.EnsureSuccessStatusCode();
        var listed = Assert.Single((await member.GetFromJsonAsync<List<DebtDto>>("/api/debts", TestContext.Current.CancellationToken))!);
        Assert.Equal(new DebtDto(debt.Id, "2500.00", 5.5m), listed);
        Assert.Equal("-2500.00", (await member.GetFromJsonAsync<NetWorthDto>("/api/networth", TestContext.Current.CancellationToken))!.NetWorth);
    }

    [Theory]
    [InlineData("assets", "currentValue", "-1.00")]
    [InlineData("assets", "currentValue", "1.234")]
    [InlineData("debts", "outstandingAmount", "-1.00")]
    [InlineData("debts", "interestRate", "101")]
    public async Task Create_rejects_an_invalid_value_and_names_the_field(string resource, string field, string value)
    {
        var body = new Dictionary<string, object>
        {
            ["name"] = "Invalid",
            ["type"] = resource == "assets" ? "vehicle" : "loan",
            ["currentValue"] = "1.00",
            ["outstandingAmount"] = "1.00",
            ["asOf"] = Today,
        };
        body[field] = field == "interestRate" ? decimal.Parse(value) : value;

        var response = await Client.PostAsJsonAsync($"/api/{resource}", body, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, field);
    }

    [Theory]
    [InlineData("assets")]
    [InlineData("debts")]
    public async Task Updating_or_deleting_an_unknown_record_answers_not_found(string resource)
    {
        var update = await Client.PutAsJsonAsync(
            $"/api/{resource}/{Guid.NewGuid()}",
            new { name = "Ghost", type = resource == "assets" ? "vehicle" : "loan", currentValue = "1.00", outstandingAmount = "1.00", asOf = Today }, TestContext.Current.CancellationToken);
        var delete = await Client.DeleteAsync($"/api/{resource}/{Guid.NewGuid()}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, update.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
    }

    private sealed record AssetDto(Guid Id, string Name, string CurrentValue);

    private sealed record DebtDto(Guid Id, string OutstandingAmount, decimal? InterestRate);

    private sealed record NetWorthDto(string NetWorth);
}
