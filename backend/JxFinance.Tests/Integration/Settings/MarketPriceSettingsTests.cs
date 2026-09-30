using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Settings;

[Collection<IntegrationCollection>]
public sealed class MarketPriceSettingsTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Url = "/api/settings/market-prices";

    [Fact]
    public async Task The_key_is_never_in_any_response()
    {
        var key = $"eodhd-secret-{Guid.NewGuid():N}";

        var saved = await Client.PutAsJsonAsync(Url, new { enabled = false, eodhdApiKey = key }, TestContext.Current.CancellationToken);
        var bodies = new[]
        {
            await saved.Content.ReadAsStringAsync(TestContext.Current.CancellationToken),
            await Client.GetStringAsync(Url, TestContext.Current.CancellationToken),
            await Client.GetStringAsync("/api/settings", TestContext.Current.CancellationToken),
            await Client.GetStringAsync("/api/settings/public", TestContext.Current.CancellationToken),
        };
        var stored = await SqlValueAsync<string>($"""SELECT "EodhdProtectedKey" AS "Value" FROM "InstanceSettings" """);

        saved.EnsureSuccessStatusCode();
        Assert.All(bodies, body => Assert.DoesNotContain(key, body, StringComparison.Ordinal));
        Assert.Contains("\"hasKey\":true", bodies[1], StringComparison.Ordinal);
        Assert.DoesNotContain(key, stored, StringComparison.Ordinal);
        Assert.NotEmpty(stored);
    }

    [Fact]
    public async Task Null_keeps_the_key_and_an_empty_string_removes_it()
    {
        await PutAsync(false, "a-key");

        var kept = await PutAsync(true, null);
        var removed = await PutAsync(false, "");

        Assert.Equal((true, true), (kept.Enabled, kept.HasKey));
        Assert.Equal((false, false), (removed.Enabled, removed.HasKey));
    }

    [Fact]
    public async Task A_member_is_refused_every_market_price_route()
    {
        using var member = await CreateUserClientAsync();
        var security = await CreateSecurityAsync(Client);

        var responses = new[]
        {
            await member.GetAsync(Url, TestContext.Current.CancellationToken),
            await member.PutAsJsonAsync(Url, new { enabled = true }, TestContext.Current.CancellationToken),
            await member.PostAsync($"{Url}/sync", null, TestContext.Current.CancellationToken),
            await member.PostAsync($"/api/investments/securities/{security}/price-symbol/find", null, TestContext.Current.CancellationToken),
        };
        var mapping = await member.PostAsJsonAsync(
            "/api/investments/securities",
            new { symbol = NewSymbol(), name = "Mapped by a member", type = "crypto", currency = "eur", priceSource = "kraken", priceSymbol = "XBTEUR" },
            TestContext.Current.CancellationToken);

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode));
        await AssertProblemAsync(mapping, HttpStatusCode.Forbidden, "access.forbidden");
    }

    [Fact]
    public async Task A_mapping_is_checked_against_the_source()
    {
        await PutAsync(false, "");

        var kraken = await Client.PostAsJsonAsync(
            "/api/investments/securities",
            new { symbol = NewSymbol(), name = "Dollar coin", type = "crypto", currency = "usd", priceSource = "kraken", priceSymbol = "XBTUSD" },
            TestContext.Current.CancellationToken);
        var withoutSymbol = await Client.PostAsJsonAsync(
            "/api/investments/securities",
            new { symbol = NewSymbol(), name = "No symbol", type = "etf", currency = "eur", priceSource = "eodhd" },
            TestContext.Current.CancellationToken);
        var withoutKey = await Client.PostAsJsonAsync(
            "/api/investments/securities",
            new { symbol = NewSymbol(), name = "No key", type = "etf", currency = "eur", priceSource = "eodhd", priceSymbol = "VWCE.XETRA" },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(kraken, HttpStatusCode.BadRequest, "range.invalid");
        await AssertProblemAsync(withoutSymbol, HttpStatusCode.BadRequest, "required");
        await AssertProblemAsync(withoutKey, HttpStatusCode.BadRequest, "marketPrices.keyRequired");
    }

    [Fact]
    public async Task Find_answers_the_candidates_of_the_isin_and_saves_nothing()
    {
        await PutAsync(false, "test-key");
        await SqlAsync($"""UPDATE "InstanceSettings" SET "PriceCallsUsed" = 0""");
        var security = await PostAsync<IdDto>(
            Client,
            "/api/investments/securities",
            new { symbol = NewSymbol(), name = "World fund", type = "etf", currency = "eur", isin = "IE00BK5BQT80" });

        var candidates = await ReadOkAsync<List<CandidateDto>>(await Client.PostAsync(
            $"/api/investments/securities/{security.Id}/price-symbol/find",
            null,
            TestContext.Current.CancellationToken));
        var settings = await PutAsync(false, null);

        Assert.Equal(new CandidateDto("VWCE.XETRA", "XETRA", "EUR"), Assert.Single(candidates));
        Assert.Equal(19, settings.CallsLeft);
    }

    [Fact]
    public async Task A_backup_restored_under_another_key_ring_answers_key_unreadable()
    {
        await PutAsync(false, "test-key");
        var security = await PostAsync<IdDto>(
            Client,
            "/api/investments/securities",
            new { symbol = NewSymbol(), name = "Mapped fund", type = "etf", currency = "eur", isin = "IE00BK5BQT80", priceSource = "eodhd", priceSymbol = $"{NewSymbol()}.XETRA" });
        var account = await CreateAccountAsync("1000.00", "investment");
        await RecordInvestmentAsync(Client, new { accountId = account, securityId = security.Id, type = "buy", date = "2026-06-01", quantity = "1", price = "100" });
        await SqlAsync($"""UPDATE "InstanceSettings" SET "EodhdProtectedKey" = 'CfDJ8-from-another-key-ring'""");

        var sync = await Client.PostAsync($"{Url}/sync", null, TestContext.Current.CancellationToken);
        var find = await Client.PostAsync($"/api/investments/securities/{security.Id}/price-symbol/find", null, TestContext.Current.CancellationToken);
        var settings = await ReadOkAsync<SettingsDto>(await Client.GetAsync(Url, TestContext.Current.CancellationToken));

        await AssertProblemAsync(sync, HttpStatusCode.BadRequest, "marketPrices.keyUnreadable");
        await AssertProblemAsync(find, HttpStatusCode.BadRequest, "marketPrices.keyUnreadable");
        Assert.True(settings.HasKey);
        await PutAsync(false, "test-key");
    }

    private async Task<SettingsDto> PutAsync(bool enabled, string? key) =>
        await ReadOkAsync<SettingsDto>(await Client.PutAsJsonAsync(Url, new { enabled, eodhdApiKey = key }, TestContext.Current.CancellationToken));

    private sealed record SettingsDto(bool Enabled, bool HasKey, int CallsLeft);

    private sealed record CandidateDto(string Symbol, string Exchange, string Currency);
}
