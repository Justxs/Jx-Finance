using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.NetWorth;

[Collection<IntegrationCollection>]
public sealed class NetWorthCurrencyTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Assets_and_debts_keep_the_currency_they_were_entered_in_and_net_worth_converts_them()
    {
        using var member = await CreateUserClientAsync();
        await CreateAccountAsync("500.00", client: member);
        var car = await PostAsync<AssetDto>(member, "/api/assets", Asset("1000.00"));
        var loan = await PostAsync<DebtDto>(member, "/api/debts", Debt("400.00"));
        Assert.Equal(("eur", "eur"), (car.Currency, loan.Currency));

        AssetDto boat;
        await using (await OverrideSettingsAsync(settings => settings["reportingCurrency"] = "usd"))
        {
            Assert.Equal(new NetWorthDto("550.00", "1100.00", "440.00", "1210.00", true), await NetWorthAsync(member));

            boat = await PostAsync<AssetDto>(member, "/api/assets", Asset("200.00"));
            var revalued = await member.PutAsJsonAsync($"/api/assets/{car.Id}", Asset("2000.00"), TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, revalued.StatusCode);
            Assert.Equal("eur", (await revalued.Content.ReadFromJsonAsync<AssetDto>(TestContext.Current.CancellationToken))!.Currency);

            Assert.Equal(new NetWorthDto("550.00", "2400.00", "440.00", "2510.00", true), await NetWorthAsync(member));
        }

        Assert.Equal("usd", boat.Currency);
        Assert.Equal(new NetWorthDto("500.00", "2181.82", "400.00", "2281.82", true), await NetWorthAsync(member));
    }

    [Fact]
    public async Task Snapshots_are_stored_in_the_reporting_currency_and_history_converts_older_ones()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        await CreateAccountAsync("1000.00", client: member);
        var earlier = new DateOnly(2026, 6, 1);
        await StoreSnapshotAsync(user.Id, earlier, 100.00m, "EUR");

        await using (await OverrideSettingsAsync(settings => settings["reportingCurrency"] = "usd"))
        {
            Assert.Equal("1100.00", (await NetWorthAsync(member)).NetWorth);
            Assert.Equal("USD", await StoredSnapshotCurrencyAsync(user.Id, Today));

            var inDollars = await HistoryAsync(member);
            Assert.Equal("110.00", inDollars.Single(i => i.Date == earlier).NetWorth);
            Assert.Equal("1100.00", inDollars.Single(i => i.Date == Today).NetWorth);
        }

        var inEuros = await HistoryAsync(member);
        Assert.Equal("100.00", inEuros.Single(i => i.Date == earlier).NetWorth);
        Assert.Equal("1000.00", inEuros.Single(i => i.Date == Today).NetWorth);
    }

    [Fact]
    public async Task Net_worth_says_when_a_holding_could_not_be_valued()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", "investment", client: member);
        var unpriced = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = unpriced, type = "buy", date = "2026-06-01", quantity = "1", price = "100" });

        Assert.False((await NetWorthAsync(member)).IsComplete);
        Assert.Empty(await HistoryAsync(member));
    }

    private object Asset(string currentValue) =>
        new { name = $"Asset {Guid.NewGuid():N}", type = "vehicle", currentValue, asOf = Today };

    private object Debt(string outstandingAmount) =>
        new { name = $"Debt {Guid.NewGuid():N}", type = "loan", outstandingAmount, asOf = Today };

    private static async Task<NetWorthDto> NetWorthAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<NetWorthDto>("/api/networth"))!;

    private static async Task<List<NetWorthSnapshotItemDto>> HistoryAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<NetWorthHistoryDto>("/api/networth/history"))!.Items;

    private Task StoreSnapshotAsync(Guid userId, DateOnly date, decimal amount, string currency) =>
        SqlAsync($"""
            INSERT INTO "NetWorthSnapshots"
            ("Id", "UserId", "Date", "Accounts", "Assets", "Debts", "NetWorthValue", "Currency", "CreatedAt", "UpdatedAt", "IsDeleted")
            VALUES ({Guid.NewGuid()}, {userId}, {date}, {amount}, 0, 0, {amount}, {currency}, now(), now(), false)
            """);

    private Task<string> StoredSnapshotCurrencyAsync(Guid userId, DateOnly date) =>
        SqlValueAsync<string>($"""SELECT "Currency" AS "Value" FROM "NetWorthSnapshots" WHERE "UserId" = {userId} AND "Date" = {date}""");

    private sealed record AssetDto(Guid Id, string CurrentValue, string Currency);

    private sealed record DebtDto(Guid Id, string OutstandingAmount, string Currency);

    private sealed record NetWorthDto(string Accounts, string Assets, string Debts, string NetWorth, bool IsComplete);

}
