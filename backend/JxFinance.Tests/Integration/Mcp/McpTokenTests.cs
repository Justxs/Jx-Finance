using System.Net.Http.Json;
using System.Text.Json;
using JxFinance.Infrastructure.Auth;
using JxFinance.Tests.Support;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;

namespace JxFinance.Tests.Integration.Mcp;

[Collection<PeopleCollection>]
public sealed class McpTokenTests(PeopleFixture fixture) : IntegrationTestBase(fixture)
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task A_read_token_lists_only_reads_and_reads_the_ledger()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var browser = await LoginAsync(user);
        var account = await CreateAccountAsync("100.00", client: browser);
        var recorded = await CreateTransactionAsync(browser, account, null, "expense", "12.40", "2026-09-01", "Maxima");
        using var script = TokenClient((await IssueTokenAsync(user.Id)).Token);
        await using var mcp = await ConnectAsync(script);

        var tools = await mcp.ListToolsAsync(cancellationToken: TestContext.Current.CancellationToken);
        var page = await CallAsync<PageDto<TransactionDto>>(mcp, "get_transactions", new Dictionary<string, object?>());

        Assert.Contains(tools, tool => tool.Name == "get_transactions");
        Assert.All(tools, tool => Assert.True(tool.ProtocolTool.Annotations?.ReadOnlyHint, tool.Name));
        Assert.Equal([recorded.Id], page.Items.Select(t => t.Id));
    }

    [Fact]
    public async Task A_read_token_cannot_call_a_write_tool()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var browser = await LoginAsync(user);
        var account = await CreateAccountAsync(client: browser);
        using var script = TokenClient((await IssueTokenAsync(user.Id)).Token);
        await using var mcp = await ConnectAsync(script);

        var refused = await mcp.CallToolAsync("create_transaction", Expense(account), cancellationToken: TestContext.Current.CancellationToken);

        Assert.True(refused.IsError);
        Assert.EndsWith(
            "Tool 'create_transaction' is not available for the current caller.",
            Assert.IsType<TextContentBlock>(Assert.Single(refused.Content)).Text,
            StringComparison.Ordinal);
        Assert.Empty((await browser.GetFromJsonAsync<PageDto<TransactionDto>>("/api/transactions", TestContext.Current.CancellationToken))!.Items);
    }

    [Fact]
    public async Task A_read_and_write_token_records_a_transaction_and_the_activity_names_the_token()
    {
        await using var on = await ApiTokensOnAsync();
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        using var script = TokenClient((await IssueTokenAsync(pair.Owner.Id, access: TokenAccess.ReadWrite, name: "Claude")).Token);
        await using var mcp = await ConnectAsync(script);

        var created = await CallAsync<TransactionDto>(mcp, "create_transaction", Expense(shared));

        Assert.Equal(("12.40", "api"), (created.Amount, created.Source));
        var events = (await pair.PartnerClient.GetFromJsonAsync<PageDto<AuditDto>>(
            $"/api/households/{pair.HouseholdId}/audit?pageSize=50",
            TestContext.Current.CancellationToken))!.Items;
        var audit = Assert.Single(events, e => e.EntityKind == "transaction" && e.Action == "created" && e.EntityId == created.Id);
        Assert.Equal("Claude", audit.ViaToken);
    }

    [Fact]
    public async Task A_switched_off_feature_hides_its_tools()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var script = TokenClient((await IssueTokenAsync(user.Id, access: TokenAccess.ReadWrite)).Token);
        await using var off = await FeatureOffAsync("goals");
        await using var mcp = await ConnectAsync(script);

        var tools = (await mcp.ListToolsAsync(cancellationToken: TestContext.Current.CancellationToken)).Select(tool => tool.Name).ToList();

        Assert.Contains("create_transaction", tools);
        Assert.DoesNotContain("get_goals", tools);
        Assert.DoesNotContain("update_goal_progress", tools);
    }

    [Fact]
    public async Task A_browser_session_lists_no_tools()
    {
        var user = await CreateUserAsync();
        using var browser = await LoginAsync(user);
        await using var mcp = await ConnectAsync(browser);

        Assert.Empty(await mcp.ListToolsAsync(cancellationToken: TestContext.Current.CancellationToken));
    }

    private static async Task<McpClient> ConnectAsync(HttpClient client) =>
        await McpClient.CreateAsync(
            new HttpClientTransport(
                new HttpClientTransportOptions
                {
                    Endpoint = new Uri(client.BaseAddress!, "/api/mcp"),
                    TransportMode = HttpTransportMode.StreamableHttp,
                },
                client),
            cancellationToken: TestContext.Current.CancellationToken);

    private static async Task<T> CallAsync<T>(McpClient mcp, string tool, Dictionary<string, object?> arguments)
    {
        var result = await mcp.CallToolAsync(tool, arguments, cancellationToken: TestContext.Current.CancellationToken);
        var text = Assert.IsType<TextContentBlock>(Assert.Single(result.Content)).Text;
        Assert.False(result.IsError, text);
        return JsonSerializer.Deserialize<T>(text, Web)!;
    }

    private static Dictionary<string, object?> Expense(Guid accountId) => new()
    {
        ["accountId"] = accountId,
        ["categoryId"] = null,
        ["type"] = "expense",
        ["amount"] = "12.40",
        ["date"] = "2026-09-01",
        ["description"] = "Maxima",
        ["lines"] = null,
    };

    private sealed record AuditDto(Guid Id, string? ViaToken, string Action, string EntityKind, Guid? EntityId);
}
