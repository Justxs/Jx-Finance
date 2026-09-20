using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class SecurityAuthorizationTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_member_cannot_change_the_details_of_a_security()
    {
        using var member = await CreateUserClientAsync();
        var (id, symbol) = await CreateSharedSecurityAsync(member);

        var response = await member.PutAsJsonAsync(
            $"/api/investments/securities/{id}",
            new { symbol, name = "Renamed by a member", type = "stock", currency = "eur", lastPrice = "1" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var security = await FindAsync(symbol);
        Assert.Equal(("Shared fund", "etf", null), (security.Name, security.Type, security.LastPrice));
    }

    [Fact]
    public async Task A_member_can_price_a_security_they_hold()
    {
        using var member = await CreateUserClientAsync();
        var (id, symbol) = await CreateSharedSecurityAsync(member);
        await BuyAsync(member, id);

        var response = await member.PutAsJsonAsync(
            $"/api/investments/securities/{id}/price",
            new { lastPrice = "123.45", lastPriceDate = "2026-06-05" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var security = await FindAsync(symbol);
        Assert.Equal(("123.45", new DateOnly(2026, 6, 5), "Shared fund"), (security.LastPrice, security.LastPriceDate, security.Name));
    }

    [Fact]
    public async Task A_price_without_a_date_is_dated_today()
    {
        using var member = await CreateUserClientAsync();
        var (id, symbol) = await CreateSharedSecurityAsync(member);
        await BuyAsync(member, id);

        (await member.PutAsJsonAsync($"/api/investments/securities/{id}/price", new { lastPrice = "7" })).EnsureSuccessStatusCode();

        Assert.Equal(Today, (await FindAsync(symbol)).LastPriceDate);
    }

    [Fact]
    public async Task A_member_cannot_price_a_security_they_do_not_hold()
    {
        using var holder = await CreateUserClientAsync();
        using var stranger = await CreateUserClientAsync();
        var (id, symbol) = await CreateSharedSecurityAsync(holder);
        await BuyAsync(holder, id);

        var response = await stranger.PutAsJsonAsync($"/api/investments/securities/{id}/price", new { lastPrice = "0.01" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Contains("security.notHeld", await response.Content.ReadAsStringAsync());
        Assert.Null((await FindAsync(symbol)).LastPrice);
    }

    [Fact]
    public async Task A_member_who_sold_everything_can_no_longer_price_the_security()
    {
        using var member = await CreateUserClientAsync();
        var (id, _) = await CreateSharedSecurityAsync(member);
        var account = await BuyAsync(member, id);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = id, type = "sell", date = "2026-06-02", quantity = "2", price = "100" });

        var response = await member.PutAsJsonAsync($"/api/investments/securities/{id}/price", new { lastPrice = "5" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task A_household_member_can_price_a_security_held_on_a_shared_account()
    {
        var owner = await CreateUserAsync();
        var partner = await CreateUserAsync();
        using var ownerClient = await LoginAsync(owner);
        using var partnerClient = await LoginAsync(partner);
        var household = await PostAsync<IdDto>(ownerClient, "/api/households", new { name = $"Household {Guid.NewGuid():N}" });
        await PostAsync<IdDto>(ownerClient, $"/api/households/{household.Id}/members", new { email = partner.Email, role = "member" });
        var (id, _) = await CreateSharedSecurityAsync(ownerClient);
        await BuyAsync(ownerClient, id, household.Id);

        var response = await partnerClient.PutAsJsonAsync($"/api/investments/securities/{id}/price", new { lastPrice = "5" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task An_administrator_can_change_details_and_price_without_holding_the_security()
    {
        using var member = await CreateUserClientAsync();
        var (id, symbol) = await CreateSharedSecurityAsync(member);

        var details = await Client.PutAsJsonAsync(
            $"/api/investments/securities/{id}",
            new { symbol, name = "Renamed by the administrator", type = "fund", currency = "eur" });
        var price = await Client.PutAsJsonAsync(
            $"/api/investments/securities/{id}/price",
            new { lastPrice = "9.5", lastPriceDate = "2026-06-05" });

        Assert.Equal(HttpStatusCode.OK, details.StatusCode);
        Assert.Equal(HttpStatusCode.OK, price.StatusCode);
        var security = await FindAsync(symbol);
        Assert.Equal(("Renamed by the administrator", "fund", "9.5"), (security.Name, security.Type, security.LastPrice));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("-1")]
    [InlineData("1.123456789")]
    public async Task A_price_must_be_a_non_negative_quantity(string? lastPrice)
    {
        var (id, _) = await CreateSharedSecurityAsync(Client);

        var response = await Client.PutAsJsonAsync($"/api/investments/securities/{id}/price", new { lastPrice });

        await AssertValidationErrorAsync(response, "lastPrice");
    }

    [Fact]
    public async Task Pricing_an_unknown_security_is_not_found()
    {
        var response = await Client.PutAsJsonAsync($"/api/investments/securities/{Guid.NewGuid()}/price", new { lastPrice = "1" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Creating_a_security_with_the_id_of_an_existing_one_does_not_overwrite_it()
    {
        using var member = await CreateUserClientAsync();
        var (id, symbol) = await CreateSharedSecurityAsync(member);

        var response = await member.PostAsJsonAsync(
            $"/api/investments/securities?id={id}",
            new { id, symbol = NewSymbol(), name = "Overwrite attempt", type = "stock", currency = "eur" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotEqual(id, (await response.Content.ReadFromJsonAsync<SecurityDto>())!.Id);
        var original = await FindAsync(symbol);
        Assert.Equal((id, "Shared fund"), (original.Id, original.Name));
    }

    [Fact]
    public async Task Concurrent_attempts_to_add_the_same_security_create_one_and_answer_conflict_to_the_rest()
    {
        var body = new { symbol = NewSymbol(), name = "Raced fund", type = "etf", currency = "eur" };

        var responses = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => Client.PostAsJsonAsync("/api/investments/securities", body)));

        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
        Assert.Equal(5, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
    }

    private static async Task<(Guid Id, string Symbol)> CreateSharedSecurityAsync(HttpClient client)
    {
        var symbol = NewSymbol();
        return (await CreateSecurityAsync(client, symbol, "Shared fund"), symbol);
    }

    private async Task<Guid> BuyAsync(HttpClient client, Guid securityId, Guid? householdId = null)
    {
        var account = await CreateAccountAsync("1000.00", "investment", householdId: householdId, client: client);
        await RecordInvestmentAsync(client, new { accountId = account, securityId, type = "buy", date = "2026-06-01", quantity = "2", price = "100" });
        return account;
    }

    private async Task<SecurityDto> FindAsync(string symbol) =>
        Assert.Single((await Client.GetFromJsonAsync<List<SecurityDto>>($"/api/investments/securities?search={symbol}"))!);

    private sealed record SecurityDto(Guid Id, string Symbol, string Name, string Type, string? LastPrice, DateOnly? LastPriceDate);
}
