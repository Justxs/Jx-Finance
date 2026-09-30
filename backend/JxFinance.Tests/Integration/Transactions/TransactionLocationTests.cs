using System.Net.Http.Json;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Auth;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class TransactionLocationTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Theory]
    [InlineData(54.687, null)]
    [InlineData(null, 25.28)]
    [InlineData(90.5, 25.28)]
    [InlineData(54.687, -180.5)]
    public async Task Coordinates_must_come_in_pairs_and_within_range(double? latitude, double? longitude)
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);

        var response = await member.PostAsJsonAsync(
            "/api/transactions",
            Body(account, "Maxima", (decimal?)latitude, (decimal?)longitude),
            TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "latitude");
        Assert.Contains("transaction.locationInvalid", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_place_is_trimmed_and_coordinates_are_kept_to_five_decimals()
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);

        var created = await ReadOkAsync<LocatedDto>(await member.PostAsJsonAsync(
            "/api/transactions",
            Body(account, "  Maxima, Ozo g. 18, Vilnius  ", 54.6871234m, 25.2799876m),
            TestContext.Current.CancellationToken));
        var read = await member.GetFromJsonAsync<LocatedDto>($"/api/transactions/{created.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(("Maxima, Ozo g. 18, Vilnius", 54.68712m, 25.27999m), (created.Place, created.Latitude, created.Longitude));
        Assert.Equal(created, read);
    }

    [Fact]
    public async Task A_place_longer_than_120_characters_is_rejected()
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);

        var response = await member.PostAsJsonAsync("/api/transactions", Body(account, new string('a', 121), null, null), TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "place");
    }

    [Fact]
    public async Task The_switch_off_hides_the_fields_on_read_and_ignores_them_on_write()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        LocatedDto stored;
        await using (await LocationsOnAsync())
        {
            stored = await ReadOkAsync<LocatedDto>(await member.PostAsJsonAsync(
                "/api/transactions",
                Body(account, "Rimi", 54.7m, 25.3m),
                TestContext.Current.CancellationToken));
        }

        var created = await ReadOkAsync<LocatedDto>(await member.PostAsJsonAsync(
            "/api/transactions",
            Body(account, "Iki", 54.8m, 25.4m),
            TestContext.Current.CancellationToken));
        var read = await member.GetFromJsonAsync<LocatedDto>($"/api/transactions/{stored.Id}", TestContext.Current.CancellationToken);
        var searched = await member.GetFromJsonAsync<PageDto<LocatedDto>>("/api/transactions?search=rimi", TestContext.Current.CancellationToken);
        var filtered = await member.GetFromJsonAsync<PageDto<LocatedDto>>("/api/transactions?place=rimi", TestContext.Current.CancellationToken);
        var csv = await member.GetStringAsync("/api/transactions/export", TestContext.Current.CancellationToken);

        Assert.Equal((null, null, null), (read!.Place, read.Latitude, read.Longitude));
        Assert.Equal((null, null, null), (created.Place, created.Latitude, created.Longitude));
        Assert.Empty(searched!.Items);
        Assert.Equal(2, filtered!.Items.Count);
        Assert.DoesNotContain("Rimi", csv, StringComparison.Ordinal);
        (string?, decimal?)[] expected = [("Rimi", 54.7m), (null, null)];
        Assert.Equal(expected, (await RowsAsync(account)).Select(r => (r.Place, r.Latitude)));
    }

    [Fact]
    public async Task An_update_with_the_switch_off_keeps_the_stored_place()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        LocatedDto stored;
        await using (await LocationsOnAsync())
        {
            stored = await ReadOkAsync<LocatedDto>(await member.PostAsJsonAsync(
                "/api/transactions",
                Body(account, "Rimi", 54.7m, 25.3m),
                TestContext.Current.CancellationToken));
        }

        var updated = await member.PutAsJsonAsync($"/api/transactions/{stored.Id}", Body(account, null, null, null, "13.00"), TestContext.Current.CancellationToken);
        updated.EnsureSuccessStatusCode();

        await using var on = await LocationsOnAsync();
        var read = await member.GetFromJsonAsync<LocatedDto>($"/api/transactions/{stored.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(("Rimi", 54.7m, 25.3m), (read!.Place, read.Latitude, read.Longitude));
    }

    [Fact]
    public async Task An_update_with_the_switch_on_replaces_and_clears_the_place()
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var stored = await ReadOkAsync<LocatedDto>(await member.PostAsJsonAsync("/api/transactions", Body(account, "Rimi", 54.7m, 25.3m), TestContext.Current.CancellationToken));

        var cleared = await ReadOkAsync<LocatedDto>(await member.PutAsJsonAsync($"/api/transactions/{stored.Id}", Body(account, null, null, null), TestContext.Current.CancellationToken));

        Assert.Equal((null, null, null), (cleared.Place, cleared.Latitude, cleared.Longitude));
    }

    [Fact]
    public async Task The_place_filter_and_the_search_narrow_the_list_the_summary_and_the_exports()
    {
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("500.00", client: member);
        await RecordTransactionAsync(member, Body(account, "Maxima, Ozo g. 18, Vilnius", null, null, "10.00"));
        await RecordTransactionAsync(member, Body(account, "MAXIMA Akropolis", null, null, "5.00"));
        await RecordTransactionAsync(member, Body(account, "Rimi Ozas", null, null, "7.00"));
        await RecordTransactionAsync(member, Body(account, null, null, null, "3.00"));

        var filtered = await member.GetFromJsonAsync<PageDto<LocatedDto>>("/api/transactions?place=maxima", TestContext.Current.CancellationToken);
        var searched = await member.GetFromJsonAsync<PageDto<LocatedDto>>("/api/transactions?search=ozas", TestContext.Current.CancellationToken);
        var summary = await member.GetFromJsonAsync<SummaryDto>("/api/transactions/summary?place=maxima", TestContext.Current.CancellationToken);
        var csv = await member.GetStringAsync("/api/transactions/export?place=maxima", TestContext.Current.CancellationToken);
        var pdf = await member.GetAsync("/api/transactions/export/pdf?place=maxima", TestContext.Current.CancellationToken);

        Assert.Equal(["MAXIMA Akropolis", "Maxima, Ozo g. 18, Vilnius"], filtered!.Items.Select(t => t.Place!).Order(StringComparer.Ordinal));
        Assert.Equal(["Rimi Ozas"], searched!.Items.Select(t => t.Place));
        Assert.Equal((2, "15.00"), (summary!.Count, summary.TotalExpense));
        var lines = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        Assert.EndsWith(",Spread months,Place", lines[0]);
        Assert.Equal(3, lines.Length);
        Assert.Contains(lines, line => line.EndsWith(",\"Maxima, Ozo g. 18, Vilnius\"", StringComparison.Ordinal));
        Assert.Contains(lines, line => line.EndsWith(",MAXIMA Akropolis", StringComparison.Ordinal));
        pdf.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task A_housemate_sees_the_place_on_a_shared_account()
    {
        await using var on = await LocationsOnAsync();
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("100.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var created = await ReadOkAsync<LocatedDto>(await pair.OwnerClient.PostAsJsonAsync(
            "/api/transactions",
            Body(shared, "Lidl, Ukmergės g. 369", 54.72m, 25.23m),
            TestContext.Current.CancellationToken));

        var seen = await pair.PartnerClient.GetFromJsonAsync<LocatedDto>($"/api/transactions/{created.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(created, seen);
    }

    [Fact]
    public async Task The_audit_log_records_the_place_and_not_the_coordinates()
    {
        await using var on = await LocationsOnAsync();
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("100.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var created = await ReadOkAsync<LocatedDto>(await pair.OwnerClient.PostAsJsonAsync(
            "/api/transactions",
            Body(shared, "Rimi", 54.7m, 25.3m),
            TestContext.Current.CancellationToken));

        var updated = await pair.OwnerClient.PutAsJsonAsync(
            $"/api/transactions/{created.Id}",
            Body(shared, "Rimi Ozas", 54.71m, 25.31m),
            TestContext.Current.CancellationToken);
        updated.EnsureSuccessStatusCode();

        var audit = await ReadOkAsync<PageDto<AuditDto>>(await pair.OwnerClient.GetAsync(
            $"/api/households/{pair.HouseholdId}/audit?pageSize=50",
            TestContext.Current.CancellationToken));
        var change = Assert.Single(audit.Items, e => e.EntityId == created.Id && e.Action == "updated");
        Assert.Equal([new ChangeDto("place", "Rimi", "Rimi Ozas")], change.Changes);
    }

    [Fact]
    public async Task A_read_and_write_token_records_and_edits_a_place()
    {
        await using var tokens = await ApiTokensOnAsync();
        await using var on = await LocationsOnAsync();
        var user = await CreateUserAsync();
        using var browser = await LoginAsync(user);
        var account = await CreateAccountAsync("100.00", client: browser);
        using var script = TokenClient((await IssueTokenAsync(user.Id, access: TokenAccess.ReadWrite)).Token);

        var created = await ReadOkAsync<LocatedDto>(await script.PostAsJsonAsync(
            "/api/transactions",
            Body(account, "Maxima", 54.7m, 25.3m),
            TestContext.Current.CancellationToken));
        var edited = await ReadOkAsync<LocatedDto>(await script.PutAsJsonAsync(
            $"/api/transactions/{created.Id}",
            Body(account, "Maxima Ozas", null, null),
            TestContext.Current.CancellationToken));
        var places = await script.GetFromJsonAsync<List<PlaceDto>>("/api/transactions/places", TestContext.Current.CancellationToken);

        Assert.Equal(("Maxima", 54.7m, 25.3m), (created.Place, created.Latitude, created.Longitude));
        Assert.Equal(("Maxima Ozas", null, null), (edited.Place, edited.Latitude, edited.Longitude));
        Assert.Equal(["Maxima Ozas"], places!.Select(p => p.Name));
    }

    private Task<List<Transaction>> RowsAsync(Guid account)
    {
        var accountId = new AccountId(account);
        return WithDbAsync(db => db.Transactions.IgnoreQueryFilters()
            .Where(t => t.AccountId == accountId)
            .OrderBy(t => t.CreatedAt)
            .ToListAsync(TestContext.Current.CancellationToken));
    }

    private static object Body(Guid account, string? place, decimal? latitude, decimal? longitude, string amount = "12.00") =>
        new { accountId = account, type = "expense", amount, date = "2026-09-20", description = "Groceries", place, latitude, longitude };

    private sealed record LocatedDto(Guid Id, string? Place, decimal? Latitude, decimal? Longitude);

    private sealed record SummaryDto(int Count, string TotalIncome, string TotalExpense);

    private sealed record PlaceDto(string Name, int Count, decimal? Latitude, decimal? Longitude, bool Nearby);

    private sealed record ChangeDto(string Field, string? From, string? To);

    private sealed record AuditDto(Guid? EntityId, string Action, List<ChangeDto> Changes);
}
