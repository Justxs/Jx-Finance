using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;
using Npgsql;

namespace JxFinance.Tests.Integration.Dashboard;

[Collection<IntegrationCollection>]
public sealed class DashboardLayoutTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Url = "/api/users/me/dashboard-layout";

    private static readonly string[] DefaultOrder =
    [
        "summary",
        "monthlyTrend",
        "spendingByCategory",
        "spendingPace",
        "budgets",
        "netWorth",
        "accounts",
        "recentTransactions",
        "upcomingBills",
    ];

    [Fact]
    public async Task Without_a_saved_layout_every_card_shows_in_the_default_order()
    {
        using var client = await CreateUserClientAsync();

        var layout = await client.GetFromJsonAsync<LayoutDto>(Url, TestContext.Current.CancellationToken);

        Assert.Equal(new LayoutDto(DefaultOrder, [], true), layout, LayoutComparer.Instance);
    }

    [Fact]
    public async Task A_saved_layout_is_read_back_with_the_unmentioned_cards_after_it()
    {
        using var client = await CreateUserClientAsync();

        var saved = await SaveAsync(client, ["accounts", "summary"], ["netWorth", "summary"]);
        var read = await client.GetFromJsonAsync<LayoutDto>(Url, TestContext.Current.CancellationToken);

        string[] expected = ["accounts", "summary", .. DefaultOrder.Where(c => c is not "accounts" and not "summary")];
        Assert.Equal(new LayoutDto(expected, ["summary", "netWorth"], false), saved, LayoutComparer.Instance);
        Assert.Equal(saved, read, LayoutComparer.Instance);
    }

    [Fact]
    public async Task Reset_brings_back_the_default_layout()
    {
        using var client = await CreateUserClientAsync();
        await SaveAsync(client, ["upcomingBills"], ["budgets"]);

        var response = await client.DeleteAsync(Url, TestContext.Current.CancellationToken);
        var read = await client.GetFromJsonAsync<LayoutDto>(Url, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(new LayoutDto(DefaultOrder, [], true), read, LayoutComparer.Instance);
        Assert.Equal(HttpStatusCode.OK, (await client.DeleteAsync(Url, TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task Unknown_card_ids_are_refused()
    {
        using var client = await CreateUserClientAsync();

        var order = await PutAsync(client, ["summary", "weather"], []);
        var hidden = await PutAsync(client, [], ["Summary"]);

        await AssertProblemAsync(order, HttpStatusCode.BadRequest, "dashboard.cardUnknown");
        await AssertValidationErrorAsync(order, "order[1]");
        await AssertProblemAsync(hidden, HttpStatusCode.BadRequest, "dashboard.cardUnknown");
    }

    [Fact]
    public async Task Duplicate_card_ids_are_refused()
    {
        using var client = await CreateUserClientAsync();

        var order = await PutAsync(client, ["summary", "summary"], []);
        var hidden = await PutAsync(client, [], ["budgets", "budgets"]);

        await AssertProblemAsync(order, HttpStatusCode.BadRequest, "dashboard.cardDuplicate");
        await AssertValidationErrorAsync(order, "order");
        await AssertProblemAsync(hidden, HttpStatusCode.BadRequest, "dashboard.cardDuplicate");
    }

    [Fact]
    public async Task Missing_lists_are_refused()
    {
        using var client = await CreateUserClientAsync();

        var response = await client.PutAsJsonAsync(Url, new OrderOnlyBody(["summary"]), TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "required");
    }

    [Fact]
    public async Task Household_members_keep_separate_layouts()
    {
        using var pair = await CreateHouseholdPairAsync();
        var (_, _, ownerClient, partnerClient, _) = pair;

        await SaveAsync(ownerClient, ["upcomingBills"], ["summary"]);
        var partnerLayout = await partnerClient.GetFromJsonAsync<LayoutDto>(Url, TestContext.Current.CancellationToken);
        await SaveAsync(partnerClient, ["budgets"], []);
        (await partnerClient.DeleteAsync(Url, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var ownerLayout = await ownerClient.GetFromJsonAsync<LayoutDto>(Url, TestContext.Current.CancellationToken);

        Assert.True(partnerLayout!.IsDefault);
        Assert.False(ownerLayout!.IsDefault);
        Assert.Equal("upcomingBills", ownerLayout.Order[0]);
        Assert.Equal(["summary"], ownerLayout.Hidden);
    }

    [Fact]
    public async Task A_stored_layout_with_ids_this_version_does_not_know_is_read_without_them()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        await using (var connection = new NpgsqlConnection(ConnectionString))
        {
            await connection.OpenAsync(TestContext.Current.CancellationToken);
            await using var command = new NpgsqlCommand(
                """UPDATE "AspNetUsers" SET "DashboardLayout" = @layout::jsonb WHERE "Id" = @id""",
                connection);
            command.Parameters.AddWithValue(
                "layout",
                """{"order":["weather","accounts","accounts","stocksTicker","summary"],"hidden":["weather","accounts"]}""");
            command.Parameters.AddWithValue("id", user.Id);
            Assert.Equal(1, await command.ExecuteNonQueryAsync(TestContext.Current.CancellationToken));
        }

        var layout = await client.GetFromJsonAsync<LayoutDto>(Url, TestContext.Current.CancellationToken);

        string[] expected = ["accounts", "summary", .. DefaultOrder.Where(c => c is not "accounts" and not "summary")];
        Assert.Equal(new LayoutDto(expected, ["accounts"], false), layout, LayoutComparer.Instance);
    }

    [Fact]
    public async Task Signed_out_callers_get_no_layout()
    {
        using var anonymous = CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(Url, TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await anonymous.PutAsJsonAsync(Url, new { order = Array.Empty<string>(), hidden = Array.Empty<string>() }, TestContext.Current.CancellationToken)).StatusCode);
    }

    private static Task<HttpResponseMessage> PutAsync(HttpClient client, string[] order, string[] hidden) =>
        client.PutAsJsonAsync(Url, new { order, hidden });

    private static async Task<LayoutDto> SaveAsync(HttpClient client, string[] order, string[] hidden)
    {
        var response = await client.PutAsJsonAsync(Url, new { order, hidden });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<LayoutDto>())!;
    }

    private sealed record OrderOnlyBody(string[] Order);

    private sealed record LayoutDto(IReadOnlyList<string> Order, IReadOnlyList<string> Hidden, bool IsDefault);

    private sealed class LayoutComparer : IEqualityComparer<LayoutDto?>
    {
        public static readonly LayoutComparer Instance = new();

        public bool Equals(LayoutDto? x, LayoutDto? y) =>
            x is not null
            && y is not null
            && x.IsDefault == y.IsDefault
            && x.Order.SequenceEqual(y.Order)
            && x.Hidden.SequenceEqual(y.Hidden);

        public int GetHashCode(LayoutDto? obj) => obj?.IsDefault.GetHashCode() ?? 0;
    }
}
