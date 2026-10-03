using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<LedgerCollection>]
public sealed class PlaceRenameTests(LedgerFixture fixture) : IntegrationTestBase(fixture)
{
    private const string RenameUrl = "/api/transactions/places/rename";

    [Fact]
    public async Task Renaming_answers_feature_disabled_while_the_switch_is_off()
    {
        using var member = await CreateUserClientAsync();

        var response = await RenameAsync(member, ["Maxima"], "Maxima Ozas");

        await AssertProblemAsync(response, HttpStatusCode.NotFound, "feature.disabled");
    }

    [Fact]
    public async Task Own_places_are_listed_by_name_with_every_place_and_its_count()
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("500.00", client: member);
        await PlaceAsync(member, account, "Rimi", "2026-09-01");
        await PlaceAsync(member, account, "Rimi", "2026-09-02");
        await PlaceAsync(member, account, "apotheka", "2026-09-03");
        await PlaceAsync(member, account, "Apotheka", "2026-09-04");
        await PlaceAsync(member, account, "Apotheka", "2026-09-05");

        var places = await OwnPlacesAsync(member);

        Assert.Equal([("Apotheka", 3), ("Rimi", 2)], places.Select(p => (p.Name, p.Count)));
    }

    [Fact]
    public async Task Merging_spellings_sets_one_place_keeps_coordinates_and_leaves_the_change_time()
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("500.00", client: member);
        var located = await PlaceAsync(member, account, "Maxima Ozo", "2026-09-01", 54.71000m, 25.28000m);
        var lowered = await PlaceAsync(member, account, "maxima ozo", "2026-09-02");
        var longer = await PlaceAsync(member, account, "Maxima, Ozo g. 18", "2026-09-03");
        var kept = await PlaceAsync(member, account, "Maxima Ozas", "2026-09-04");
        var other = await PlaceAsync(member, account, "Rimi", "2026-09-05");
        var stamps = await UpdatedAtAsync([located.Id, lowered.Id, longer.Id]);

        var merged = await ReadOkAsync<RenamedDto>(await RenameAsync(member, ["Maxima Ozo", "Maxima, Ozo g. 18", "Maxima Ozas"], "  Maxima Ozas "));

        Assert.Equal(3, merged.Updated);
        Assert.Equal([("Maxima Ozas", 4), ("Rimi", 1)], (await OwnPlacesAsync(member)).Select(p => (p.Name, p.Count)));
        Assert.Equal(("Maxima Ozas", 54.71000m, 25.28000m), await PlaceOfAsync(member, located.Id));
        Assert.Equal(("Maxima Ozas", null, null), await PlaceOfAsync(member, kept.Id));
        Assert.Equal(("Rimi", null, null), await PlaceOfAsync(member, other.Id));
        Assert.Equal(stamps, await UpdatedAtAsync([located.Id, lowered.Id, longer.Id]));
    }

    [Fact]
    public async Task Only_the_callers_rows_change_and_a_shared_change_is_one_line_in_the_activity_log()
    {
        await using var on = await LocationsOnAsync();
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("100.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var mine = await PlaceAsync(pair.OwnerClient, shared, "Iki Zirmunai", "2026-09-01");
        await PlaceAsync(pair.OwnerClient, shared, "IKI Zirmunai", "2026-09-02");
        var partners = await PlaceAsync(pair.PartnerClient, shared, "Iki Zirmunai", "2026-09-03");

        var renamed = await ReadOkAsync<RenamedDto>(await RenameAsync(pair.OwnerClient, ["Iki Zirmunai"], "Iki Žirmūnai"));

        Assert.Equal(2, renamed.Updated);
        Assert.Equal(("Iki Žirmūnai", null, null), await PlaceOfAsync(pair.OwnerClient, mine.Id));
        Assert.Equal(("Iki Zirmunai", null, null), await PlaceOfAsync(pair.OwnerClient, partners.Id));
        Assert.Equal([("Iki Žirmūnai", 2)], (await OwnPlacesAsync(pair.OwnerClient)).Select(p => (p.Name, p.Count)));
        Assert.Equal([("Iki Zirmunai", 1)], (await OwnPlacesAsync(pair.PartnerClient)).Select(p => (p.Name, p.Count)));
        var audit = await ReadOkAsync<PageDto<AuditDto>>(await pair.PartnerClient.GetAsync(
            $"/api/households/{pair.HouseholdId}/audit?pageSize=50",
            TestContext.Current.CancellationToken));
        var line = Assert.Single(audit.Items, e => e.Description.StartsWith("Place set to", StringComparison.Ordinal));
        Assert.Equal(("updated", "transaction", 2, null), (line.Action, line.EntityKind, line.Count, line.EntityId));
        Assert.Equal("Place set to Iki Žirmūnai, 2 transactions", line.Description);
    }

    [Fact]
    public async Task A_personal_rename_and_one_that_changes_nothing_write_no_activity_line()
    {
        await using var on = await LocationsOnAsync();
        using var pair = await CreateHouseholdPairAsync();
        var personal = await CreateAccountAsync("100.00", client: pair.OwnerClient);
        await PlaceAsync(pair.OwnerClient, personal, "Pharmacy", "2026-09-01");

        var renamed = await ReadOkAsync<RenamedDto>(await RenameAsync(pair.OwnerClient, ["Pharmacy"], "Camelia"));
        var unchanged = await ReadOkAsync<RenamedDto>(await RenameAsync(pair.OwnerClient, ["Camelia"], "Camelia"));

        Assert.Equal((1, 0), (renamed.Updated, unchanged.Updated));
        var audit = await ReadOkAsync<PageDto<AuditDto>>(await pair.OwnerClient.GetAsync(
            $"/api/households/{pair.HouseholdId}/audit?pageSize=50",
            TestContext.Current.CancellationToken));
        Assert.DoesNotContain(audit.Items, e => e.Description.StartsWith("Place set to", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("", "required")]
    [InlineData("   ", "required")]
    [InlineData("long", "text.tooLong")]
    public async Task An_empty_or_too_long_name_is_refused(string name, string code)
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();

        var response = await RenameAsync(member, ["Maxima"], name == "long" ? new string('x', 121) : name);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, code);
    }

    [Fact]
    public async Task No_places_or_an_empty_place_is_refused()
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();

        var none = await RenameAsync(member, [], "Maxima");
        var blank = await RenameAsync(member, [""], "Maxima");
        var tooMany = await RenameAsync(member, [.. Enumerable.Range(0, 51).Select(i => $"Shop {i}")], "Maxima");

        await AssertProblemAsync(none, HttpStatusCode.BadRequest, "required");
        await AssertProblemAsync(blank, HttpStatusCode.BadRequest, "required");
        await AssertProblemAsync(tooMany, HttpStatusCode.BadRequest, "collection.invalidSize");
    }

    private static Task<HttpResponseMessage> RenameAsync(HttpClient client, string[] places, string name) =>
        client.PostAsJsonAsync(RenameUrl, new { places, name }, TestContext.Current.CancellationToken);

    private static Task<TransactionDto> PlaceAsync(
        HttpClient client,
        Guid accountId,
        string place,
        string date,
        decimal? latitude = null,
        decimal? longitude = null) =>
        RecordTransactionAsync(client, new { accountId, type = "expense", amount = "4.00", date, place, latitude, longitude });

    private static async Task<List<PlaceDto>> OwnPlacesAsync(HttpClient client) =>
        await ReadOkAsync<List<PlaceDto>>(await client.GetAsync("/api/transactions/places?own=true", TestContext.Current.CancellationToken));

    private static async Task<(string? Place, decimal? Latitude, decimal? Longitude)> PlaceOfAsync(HttpClient client, Guid id)
    {
        var row = await ReadOkAsync<LocatedDto>(await client.GetAsync($"/api/transactions/{id}", TestContext.Current.CancellationToken));
        return (row.Place, row.Latitude, row.Longitude);
    }

    private async Task<List<DateTimeOffset>> UpdatedAtAsync(Guid[] ids)
    {
        List<DateTimeOffset> stamps = [];
        foreach (var id in ids)
        {
            stamps.Add(await SqlValueAsync<DateTimeOffset>($"""SELECT "UpdatedAt" AS "Value" FROM "Transactions" WHERE "Id" = {id}"""));
        }

        return stamps;
    }

    private sealed record RenamedDto(int Updated);

    private sealed record PlaceDto(string Name, int Count, decimal? Latitude, decimal? Longitude, bool Nearby);

    private sealed record LocatedDto(Guid Id, string? Place, decimal? Latitude, decimal? Longitude);

    private sealed record AuditDto(string Action, string EntityKind, Guid? EntityId, string Description, int? Count);
}
