using System.Globalization;
using System.Net;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class PlaceSuggestionTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const decimal Latitude = 54.68700m;
    private const decimal Longitude = 25.28000m;
    private const decimal HundredMetresNorth = 0.00090m;

    [Fact]
    public async Task The_places_answer_feature_disabled_while_the_switch_is_off()
    {
        using var member = await CreateUserClientAsync();

        var response = await member.GetAsync("/api/transactions/places", TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.NotFound, "feature.disabled");
    }

    [Fact]
    public async Task Places_that_differ_in_case_are_one_suggestion_with_the_newest_spelling_most_used_first()
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("500.00", client: member);
        await PlaceAsync(member, account, "maxima ozas", "2026-09-01", 54.70000m, 25.30000m);
        await PlaceAsync(member, account, "Maxima Ozas", "2026-09-10", 54.70010m, 25.30010m);
        await PlaceAsync(member, account, "MAXIMA OZAS", "2026-09-05", null, null);
        await PlaceAsync(member, account, "Rimi", "2026-09-12", null, null);
        await RecordTransactionAsync(member, new { accountId = account, type = "expense", amount = "1.00", date = "2026-09-12" });

        var places = await PlacesAsync(member, "");
        var searched = await PlacesAsync(member, "?search=ozas");

        Assert.Equal(
            [new PlaceDto("Maxima Ozas", 3, 54.70005m, 25.30005m, false), new PlaceDto("Rimi", 1, null, null, false)],
            places);
        Assert.Equal(["Maxima Ozas"], searched.Select(p => p.Name));
    }

    [Fact]
    public async Task Suggestions_come_from_visible_rows_only_and_the_active_household_narrows_them()
    {
        await using var on = await LocationsOnAsync();
        using var pair = await CreateHouseholdPairAsync();
        using var stranger = await CreateUserClientAsync();
        var shared = await CreateAccountAsync("100.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var personal = await CreateAccountAsync("100.00", client: pair.OwnerClient);
        await PlaceAsync(pair.PartnerClient, shared, "Iki Žirmūnai", "2026-09-02", null, null);
        await PlaceAsync(pair.OwnerClient, personal, "Pharmacy", "2026-09-03", null, null);
        await PlaceAsync(stranger, await CreateAccountAsync("100.00", client: stranger), "Stranger's shop", "2026-09-03", null, null);

        var owner = await PlacesAsync(pair.OwnerClient, "");
        var partner = await PlacesAsync(pair.PartnerClient, "");
        var scoped = await GetScopedAsync<List<PlaceDto>>(pair.OwnerClient, "/api/transactions/places", pair.HouseholdId);

        Assert.Equal(["Iki Žirmūnai", "Pharmacy"], owner.Select(p => p.Name));
        Assert.Equal(["Iki Žirmūnai"], partner.Select(p => p.Name));
        Assert.Equal(["Iki Žirmūnai"], scoped.Select(p => p.Name));
    }

    [Fact]
    public async Task The_nearest_place_within_150_metres_comes_first_and_one_200_metres_away_does_not()
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("500.00", client: member);
        await PlaceAsync(member, account, "Far kiosk", "2026-09-01", Latitude + (2 * HundredMetresNorth), Longitude);
        await PlaceAsync(member, account, "Far kiosk", "2026-09-02", Latitude + (2 * HundredMetresNorth), Longitude);
        await PlaceAsync(member, account, "Corner bakery", "2026-09-03", Latitude + HundredMetresNorth, Longitude);

        var near = await PlacesAsync(member, string.Create(CultureInfo.InvariantCulture, $"?lat={Latitude}&lon={Longitude}"));
        var onlyFar = await PlacesAsync(member, string.Create(CultureInfo.InvariantCulture, $"?lat={Latitude - HundredMetresNorth}&lon={Longitude}"));

        Assert.Equal([("Corner bakery", true), ("Far kiosk", false)], near.Select(p => (p.Name, p.Nearby)));
        Assert.All(onlyFar, p => Assert.False(p.Nearby));
    }

    [Theory]
    [InlineData("?lat=54.687")]
    [InlineData("?lon=25.28")]
    [InlineData("?lat=91&lon=25.28")]
    public async Task The_places_endpoint_refuses_a_lone_or_out_of_range_coordinate(string query)
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();

        var response = await member.GetAsync($"/api/transactions/places{query}", TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "transaction.locationInvalid");
    }

    private static Task<TransactionDto> PlaceAsync(HttpClient client, Guid accountId, string place, string date, decimal? latitude, decimal? longitude) =>
        RecordTransactionAsync(client, new { accountId, type = "expense", amount = "4.00", date, place, latitude, longitude });

    private static async Task<List<PlaceDto>> PlacesAsync(HttpClient client, string query) =>
        await ReadOkAsync<List<PlaceDto>>(await client.GetAsync($"/api/transactions/places{query}", TestContext.Current.CancellationToken));

    private sealed record PlaceDto(string Name, int Count, decimal? Latitude, decimal? Longitude, bool Nearby);
}
