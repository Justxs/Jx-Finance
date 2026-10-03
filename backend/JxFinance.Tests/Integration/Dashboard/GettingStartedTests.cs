using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Dashboard;

[Collection<ReportsCollection>]
public sealed class GettingStartedTests(ReportsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Url = "/api/users/me/getting-started";

    [Fact]
    public async Task A_new_member_starts_with_every_step_open_and_no_administrator_steps()
    {
        using var client = await CreateUserClientAsync();

        var steps = await StepsAsync(client);

        Assert.Equal(
            ["addAccount", "addTransaction", "sortSpending", "planAhead", "addRecurring", "secureSignIn", "closeMonth"],
            steps.Select(s => s.Step));
        Assert.All(steps, s => Assert.False(s.Done));
    }

    [Fact]
    public async Task Steps_are_done_once_the_data_exists()
    {
        using var client = await CreateUserClientAsync();
        var accountId = await CreateAccountAsync(client: client);
        var categoryId = await CreateCategoryAsync(client: client);
        await CreateTransactionAsync(client, accountId, categoryId, "expense", "12.50", Iso(Today));

        var steps = (await StepsAsync(client)).ToDictionary(s => s.Step, s => s.Done);

        Assert.True(steps["addAccount"]);
        Assert.True(steps["addTransaction"]);
        Assert.True(steps["sortSpending"]);
        Assert.False(steps["planAhead"]);
    }

    [Fact]
    public async Task A_recent_uncategorized_transaction_leaves_sorting_open()
    {
        using var client = await CreateUserClientAsync();
        var accountId = await CreateAccountAsync(client: client);
        await CreateTransactionAsync(client, accountId, null, "expense", "4.20", Iso(Today));

        var steps = (await StepsAsync(client)).ToDictionary(s => s.Step, s => s.Done);

        Assert.True(steps["addTransaction"]);
        Assert.False(steps["sortSpending"]);
    }

    [Fact]
    public async Task Steps_of_switched_off_features_are_left_out()
    {
        await using var budgets = await FeatureOffAsync("budgets");
        await using var goals = await FeatureOffAsync("goals");
        await using var monthClose = await FeatureOffAsync("monthClose");
        using var client = await CreateUserClientAsync();

        var steps = await StepsAsync(client);

        Assert.DoesNotContain(steps, s => s.Step is "planAhead" or "closeMonth");
    }

    [Fact]
    public async Task An_administrator_also_gets_the_installation_steps()
    {
        await CreateUserAsync();

        var steps = (await StepsAsync(Client)).ToDictionary(s => s.Step, s => s.Done);

        Assert.True(steps["inviteMember"]);
        Assert.False(steps["setUpEmail"]);
        Assert.Contains("takeBackup", steps.Keys);
    }

    [Fact]
    public async Task Signed_out_callers_get_no_steps()
    {
        using var anonymous = CreateClient(handleCookies: false);

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(Url, TestContext.Current.CancellationToken)).StatusCode);
    }

    private static async Task<IReadOnlyList<StepDto>> StepsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<IReadOnlyList<StepDto>>(Url, TestContext.Current.CancellationToken))!;

    private static string Iso(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private sealed record StepDto(string Step, bool Done);
}
