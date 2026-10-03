using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.NetWorth;

[Collection<NetWorthCollection>]
public sealed class OpenBalancesTests(NetWorthFixture fixture) : IntegrationTestBase(fixture)
{
    private const string OpenBalancesUrl = "/api/networth/open-balances";

    [Fact]
    public async Task Open_balances_count_only_once_a_member_chooses_and_land_on_both_sides()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync("1000.00", client: pair.OwnerClient);
        await SplitAsync(pair, await ExpenseAsync(pair.OwnerClient, account, "90.00"));
        var jonas = (await PostAsync<IdDto>(pair.OwnerClient, "/api/contacts", new { name = "Jonas" })).Id;
        (await pair.OwnerClient.PostAsJsonAsync(
            $"/api/contacts/{jonas}/payments",
            new { direction = "toContact", amount = "20.00", currency = "eur", date = "2026-09-12" },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var ola = (await PostAsync<IdDto>(pair.OwnerClient, "/api/contacts", new { name = "Ola" })).Id;
        (await pair.OwnerClient.PostAsJsonAsync(
            $"/api/contacts/{ola}/payments",
            new { direction = "fromContact", amount = "5.00", currency = "eur", date = "2026-09-12" },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var before = await NetWorthAsync(pair.OwnerClient);
        var owner = await CountAsync(pair.OwnerClient, true);
        var partner = await CountAsync(pair.PartnerClient, true);
        var off = await CountAsync(pair.OwnerClient, false);

        Assert.Equal((false, "0.00", "0.00", "910.00"), (before.CountsOpenBalances, before.Receivable, before.Payable, before.NetWorth));
        Assert.Equal((true, "65.00", "5.00", "65.00", "5.00", "970.00"), (owner.CountsOpenBalances, owner.Receivable, owner.Payable, owner.Assets, owner.Debts, owner.NetWorth));
        Assert.Equal(("0.00", "45.00", "-45.00"), (partner.Receivable, partner.Payable, partner.NetWorth));
        Assert.Equal(before, off);
    }

    [Fact]
    public async Task A_currency_without_a_rate_leaves_its_part_out_and_the_total_incomplete()
    {
        using var member = await CreateUserClientAsync();
        var jonas = (await PostAsync<IdDto>(member, "/api/contacts", new { name = "Jonas" })).Id;
        await using var currencies = await OnlyCurrenciesAsync("eur", "usd", "gbp", "pln");
        (await member.PostAsJsonAsync(
            $"/api/contacts/{jonas}/payments",
            new { direction = "toContact", amount = "100.00", currency = "pln", date = "2026-09-12" },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await member.PostAsJsonAsync(
            $"/api/contacts/{jonas}/payments",
            new { direction = "toContact", amount = "11.00", currency = "usd", date = "2026-09-12" },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var counted = await CountAsync(member, true);

        Assert.Equal(("10.00", false), (counted.Receivable, counted.IsComplete));
    }

    [Fact]
    public async Task The_active_household_counts_only_its_balance_and_every_persons()
    {
        using var pair = await CreateHouseholdPairAsync();
        var other = await CreateUserAsync();
        var otherHousehold = await CreateHouseholdAsync(pair.Owner, other);
        var account = await CreateAccountAsync("1000.00", client: pair.OwnerClient);
        await SplitAsync(pair, await ExpenseAsync(pair.OwnerClient, account, "90.00"));
        var lunch = await ExpenseAsync(pair.OwnerClient, account, "40.00");
        await PostAsync<IdDto>(
            pair.OwnerClient,
            $"/api/households/{otherHousehold}/shared-expenses",
            new { transactionId = lunch, method = "equal", shares = new[] { new { userId = pair.Owner.Id }, new { userId = other.Id } } });
        var jonas = (await PostAsync<IdDto>(pair.OwnerClient, "/api/contacts", new { name = "Jonas" })).Id;
        (await pair.OwnerClient.PostAsJsonAsync(
            $"/api/contacts/{jonas}/payments",
            new { direction = "toContact", amount = "7.00", currency = "eur", date = "2026-09-12" },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var whole = await CountAsync(pair.OwnerClient, true);
        var narrowed = await GetScopedAsync<NetWorthDto>(pair.OwnerClient, "/api/networth", pair.HouseholdId);
        var history = await pair.OwnerClient.GetFromJsonAsync<HistoryDto>("/api/networth/history", TestContext.Current.CancellationToken);

        Assert.Equal("72.00", whole.Receivable);
        Assert.Equal("52.00", narrowed.Receivable);
        Assert.Equal(whole.NetWorth, history!.Items[^1].NetWorth);
    }

    [Fact]
    public async Task With_households_off_the_balances_are_left_out_whatever_the_choice()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync("1000.00", client: pair.OwnerClient);
        await SplitAsync(pair, await ExpenseAsync(pair.OwnerClient, account, "90.00"));
        await CountAsync(pair.OwnerClient, true);

        await using var off = await FeatureOffAsync("households");
        var counted = await NetWorthAsync(pair.OwnerClient);

        Assert.Equal(("0.00", "910.00"), (counted.Receivable, counted.NetWorth));
    }

    [Fact]
    public async Task The_choice_is_required()
    {
        using var member = await CreateUserClientAsync();

        await AssertValidationErrorAsync(
            await member.PutAsJsonAsync(OpenBalancesUrl, new { }, TestContext.Current.CancellationToken),
            "count");
    }

    private static async Task<Guid> ExpenseAsync(HttpClient client, Guid account, string amount) =>
        (await CreateTransactionAsync(client, account, null, "expense", amount, "2026-09-10", "Groceries")).Id;

    private static Task SplitAsync(HouseholdPair pair, Guid transactionId) =>
        PostAsync<IdDto>(
            pair.OwnerClient,
            $"/api/households/{pair.HouseholdId}/shared-expenses",
            new { transactionId, method = "equal", shares = new[] { new { userId = pair.Owner.Id }, new { userId = pair.Partner.Id } } });

    private static async Task<NetWorthDto> CountAsync(HttpClient client, bool count) =>
        await ReadOkAsync<NetWorthDto>(await client.PutAsJsonAsync(OpenBalancesUrl, new { count }, TestContext.Current.CancellationToken));

    private static async Task<NetWorthDto> NetWorthAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<NetWorthDto>("/api/networth", TestContext.Current.CancellationToken))!;

    private sealed record NetWorthDto(
        string Accounts,
        string Assets,
        string Debts,
        string NetWorth,
        bool IsComplete,
        bool CountsOpenBalances,
        string Receivable,
        string Payable);

    private sealed record SnapshotDto(DateOnly Date, string NetWorth);

    private sealed record HistoryDto(List<SnapshotDto> Items);
}
