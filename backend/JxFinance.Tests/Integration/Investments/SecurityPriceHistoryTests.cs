using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class SecurityPriceHistoryTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_manual_price_is_written_to_the_history()
    {
        var id = await CreateSecurityAsync(Client);

        await SetPriceAsync(Client, id, "10.5", "2026-06-05");
        await SetPriceAsync(Client, id, "11", "2026-06-08");

        Assert.Equal(
            [new PriceDto(new DateOnly(2026, 6, 8), "11"), new PriceDto(new DateOnly(2026, 6, 5), "10.5")],
            await PricesAsync(Client, id));
    }

    [Fact]
    public async Task A_second_price_for_the_same_date_replaces_the_first()
    {
        var id = await CreateSecurityAsync(Client);

        await SetPriceAsync(Client, id, "10", "2026-06-05");
        await SetPriceAsync(Client, id, "12.25", "2026-06-05");

        Assert.Equal([new PriceDto(new DateOnly(2026, 6, 5), "12.25")], await PricesAsync(Client, id));
        Assert.Equal(("12.25", new DateOnly(2026, 6, 5)), await LastPriceAsync(id));
    }

    [Fact]
    public async Task An_older_dated_price_adds_a_point_and_leaves_the_last_price_alone()
    {
        var id = await CreateSecurityAsync(Client);
        await SetPriceAsync(Client, id, "20", "2026-06-10");

        await SetPriceAsync(Client, id, "15", "2026-05-01");

        Assert.Equal(("20", new DateOnly(2026, 6, 10)), await LastPriceAsync(id));
        Assert.Equal(2, (await PricesAsync(Client, id)).Count);
    }

    [Fact]
    public async Task A_price_without_a_date_is_recorded_for_today()
    {
        var id = await CreateSecurityAsync(Client);

        (await Client.PutAsJsonAsync($"/api/investments/securities/{id}/price", new { lastPrice = "7" }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal([new PriceDto(Today, "7")], await PricesAsync(Client, id));
    }

    [Fact]
    public async Task A_price_cannot_be_dated_in_the_future()
    {
        var id = await CreateSecurityAsync(Client);

        var response = await Client.PutAsJsonAsync(
            $"/api/investments/securities/{id}/price",
            new { lastPrice = "7", lastPriceDate = Today.AddDays(1).ToString("yyyy-MM-dd") }, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "lastPriceDate");
        Assert.Empty(await PricesAsync(Client, id));
    }

    [Fact]
    public async Task A_security_saved_with_a_price_gets_a_history_point()
    {
        var symbol = NewSymbol();
        var created = await PostAsync<IdDto>(
            Client,
            "/api/investments/securities",
            new { symbol, name = "Priced at creation", type = "etf", currency = "eur", lastPrice = "50", lastPriceDate = "2026-06-01" });

        (await Client.PutAsJsonAsync(
            $"/api/investments/securities/{created.Id}",
            new { symbol, name = "Priced at creation", type = "etf", currency = "eur", lastPrice = "40", lastPriceDate = "2026-05-01" }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal(("50", new DateOnly(2026, 6, 1)), await LastPriceAsync(created.Id));
        Assert.Equal(
            [new PriceDto(new DateOnly(2026, 6, 1), "50"), new PriceDto(new DateOnly(2026, 5, 1), "40")],
            await PricesAsync(Client, created.Id));
    }

    [Fact]
    public async Task The_history_can_be_limited_to_a_date_range()
    {
        var id = await CreateSecurityAsync(Client);
        await SetPriceAsync(Client, id, "1", "2026-04-01");
        await SetPriceAsync(Client, id, "2", "2026-05-01");
        await SetPriceAsync(Client, id, "3", "2026-06-01");

        var points = await Client.GetFromJsonAsync<List<PriceDto>>($"/api/investments/securities/{id}/prices?from=2026-04-15&to=2026-05-15", TestContext.Current.CancellationToken);

        Assert.Equal([new PriceDto(new DateOnly(2026, 5, 1), "2")], points);
    }

    [Fact]
    public async Task Deleting_the_newest_point_moves_the_last_price_to_the_one_before()
    {
        var id = await CreateSecurityAsync(Client);
        await SetPriceAsync(Client, id, "15", "2026-05-01");
        await SetPriceAsync(Client, id, "20", "2026-06-10");

        var response = await Client.DeleteAsync($"/api/investments/securities/{id}/prices/2026-06-10", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(("15", new DateOnly(2026, 5, 1)), await LastPriceAsync(id));
    }

    [Fact]
    public async Task Deleting_an_older_point_leaves_the_last_price_alone()
    {
        var id = await CreateSecurityAsync(Client);
        await SetPriceAsync(Client, id, "15", "2026-05-01");
        await SetPriceAsync(Client, id, "20", "2026-06-10");

        (await Client.DeleteAsync($"/api/investments/securities/{id}/prices/2026-05-01", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal(("20", new DateOnly(2026, 6, 10)), await LastPriceAsync(id));
        Assert.Single(await PricesAsync(Client, id));
    }

    [Fact]
    public async Task Deleting_the_only_point_clears_the_last_price()
    {
        var id = await CreateSecurityAsync(Client);
        await SetPriceAsync(Client, id, "15", "2026-05-01");

        (await Client.DeleteAsync($"/api/investments/securities/{id}/prices/2026-05-01", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal((null, null), await LastPriceAsync(id));
    }

    [Fact]
    public async Task Deleting_a_point_that_does_not_exist_is_not_found()
    {
        var id = await CreateSecurityAsync(Client);

        Assert.Equal(HttpStatusCode.NotFound, (await Client.DeleteAsync($"/api/investments/securities/{id}/prices/2026-05-01", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.DeleteAsync($"/api/investments/securities/{Guid.NewGuid()}/prices/2026-05-01", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync($"/api/investments/securities/{Guid.NewGuid()}/prices", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task Only_a_holder_or_an_administrator_can_delete_a_point_and_anyone_can_read_the_history()
    {
        using var holder = await CreateUserClientAsync();
        using var stranger = await CreateUserClientAsync();
        var id = await CreateSecurityAsync(holder);
        var account = await CreateAccountAsync("1000.00", "investment", client: holder);
        await RecordInvestmentAsync(holder, new { accountId = account, securityId = id, type = "buy", date = "2026-06-01", quantity = "2", price = "100" });
        await SetPriceAsync(holder, id, "101", "2026-06-02");
        await SetPriceAsync(holder, id, "102", "2026-06-03");

        var refused = await stranger.DeleteAsync($"/api/investments/securities/{id}/prices/2026-06-02", TestContext.Current.CancellationToken);
        var readable = await PricesAsync(stranger, id);
        var byHolder = await holder.DeleteAsync($"/api/investments/securities/{id}/prices/2026-06-02", TestContext.Current.CancellationToken);
        var byAdministrator = await Client.DeleteAsync($"/api/investments/securities/{id}/prices/2026-06-03", TestContext.Current.CancellationToken);

        await AssertProblemAsync(refused, HttpStatusCode.Forbidden, "security.notHeld");
        Assert.Equal(2, readable.Count);
        Assert.Equal(HttpStatusCode.NoContent, byHolder.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, byAdministrator.StatusCode);
        Assert.Empty(await PricesAsync(Client, id));
    }

    [Fact]
    public async Task A_broker_import_records_mark_prices_and_an_older_report_does_not_replace_the_last_price()
    {
        var newer = await CreateAccountAsync("0.00", "investment", "eur");
        var older = await CreateAccountAsync("0.00", "investment", "eur");
        var olderReport = SampleFlexReport.Xml
            .Replace("reportDate=\"20260630\"", "reportDate=\"20260531\"", StringComparison.Ordinal)
            .Replace("markPrice=\"120\"", "markPrice=\"90\"", StringComparison.Ordinal);

        await UploadAsync(newer, SampleFlexReport.Xml);
        await UploadAsync(older, olderReport);

        var fund = (await Client.GetFromJsonAsync<List<SecurityDto>>("/api/investments/securities?search=IE00BK5BQT80", TestContext.Current.CancellationToken))!.Single();
        var points = await PricesAsync(Client, fund.Id);
        Assert.Contains(new PriceDto(new DateOnly(2026, 6, 30), "120"), points);
        Assert.Contains(new PriceDto(new DateOnly(2026, 5, 31), "90"), points);
        Assert.DoesNotContain(points, p => p.Price == "100" || p.Price == "110");
        Assert.Equal(("120", new DateOnly(2026, 6, 30)), (fund.LastPrice, fund.LastPriceDate));
    }

    [Fact]
    public async Task With_the_investments_feature_off_the_price_and_value_history_routes_answer_not_found()
    {
        var id = await CreateSecurityAsync(Client);
        await using var _ = await FeatureOffAsync("investments");

        await AssertProblemAsync(await Client.GetAsync($"/api/investments/securities/{id}/prices", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "feature.disabled");
        await AssertProblemAsync(await Client.GetAsync("/api/investments/value-history", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "feature.disabled");
        await AssertProblemAsync(
            await Client.DeleteAsync($"/api/investments/securities/{id}/prices/2026-06-01", TestContext.Current.CancellationToken),
            HttpStatusCode.NotFound,
            "feature.disabled");
    }

    private static async Task SetPriceAsync(HttpClient client, Guid id, string lastPrice, string lastPriceDate)
    {
        var response = await client.PutAsJsonAsync($"/api/investments/securities/{id}/price", new { lastPrice, lastPriceDate });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
    }

    private static async Task<List<PriceDto>> PricesAsync(HttpClient client, Guid id) =>
        (await client.GetFromJsonAsync<List<PriceDto>>($"/api/investments/securities/{id}/prices"))!;

    private async Task<(string? Price, DateOnly? Date)> LastPriceAsync(Guid id)
    {
        var securities = await Client.GetFromJsonAsync<List<SecurityDto>>("/api/investments/securities");
        var security = securities!.Single(s => s.Id == id);
        return (security.LastPrice, security.LastPriceDate);
    }

    private async Task UploadAsync(Guid accountId, string xml)
    {
        var response = await UploadFlexAsync(Client, accountId, xml);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
    }

    private sealed record PriceDto(DateOnly Date, string Price);

    private sealed record SecurityDto(Guid Id, string? LastPrice, DateOnly? LastPriceDate);
}
