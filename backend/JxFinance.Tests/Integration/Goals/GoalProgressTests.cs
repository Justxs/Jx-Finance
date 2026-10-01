using System.Net;
using System.Net.Http.Json;
using JxFinance.Infrastructure.Auth;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Goals;

[Collection<IntegrationCollection>]
public sealed class GoalProgressTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_manual_goal_takes_a_new_amount_or_a_delta_and_may_pass_its_target_but_not_fall_below_zero()
    {
        using var member = await CreateUserClientAsync();
        var goal = await PostAsync<GoalDto>(member, "/api/goals", new { name = "Holiday", targetAmount = "2000.00", currentAmount = "100.00" });

        var set = await ReadOkAsync<GoalDto>(await PatchAsync(member, goal.Id, new { currentAmount = "300.00" }));
        var added = await ReadOkAsync<GoalDto>(await PatchAsync(member, goal.Id, new { delta = "50.00" }));
        var taken = await ReadOkAsync<GoalDto>(await PatchAsync(member, goal.Id, new { delta = "-350.00" }));
        var belowZero = await PatchAsync(member, goal.Id, new { delta = "-0.01" });
        var overTarget = await ReadOkAsync<GoalDto>(await PatchAsync(member, goal.Id, new { currentAmount = "2500.00" }));

        Assert.Equal(("300.00", "300.00"), (set.CurrentAmount, set.ProgressAmount));
        Assert.Equal("350.00", added.CurrentAmount);
        Assert.Equal("0.00", taken.CurrentAmount);
        await AssertProblemAsync(belowZero, HttpStatusCode.BadRequest, "money.nonNegative");
        Assert.Equal(("Holiday", "2000.00", "2500.00"), (overTarget.Name, overTarget.TargetAmount, overTarget.CurrentAmount));
        var listed = Assert.Single((await member.GetFromJsonAsync<List<GoalDto>>("/api/goals", TestContext.Current.CancellationToken))!);
        Assert.Equal("2500.00", listed.ProgressAmount);
    }

    [Fact]
    public async Task A_funded_goal_is_refused_and_another_users_goal_is_not_found()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync("1000.00", client: pair.OwnerClient);
        var funded = await PostAsync<GoalDto>(
            pair.OwnerClient,
            "/api/goals",
            new { name = "Deposit", targetAmount = "5000.00", funding = "account", fundingAccountId = account });
        var personal = await PostAsync<GoalDto>(pair.OwnerClient, "/api/goals", new { name = "Private", targetAmount = "500.00", currentAmount = "50.00" });

        await AssertProblemAsync(await PatchAsync(pair.OwnerClient, funded.Id, new { delta = "10.00" }), HttpStatusCode.BadRequest, "goal.notManual");
        await AssertProblemAsync(await PatchAsync(pair.PartnerClient, personal.Id, new { currentAmount = "1.00" }), HttpStatusCode.NotFound, "resource.notFound");
        var stored = (await pair.OwnerClient.GetFromJsonAsync<List<GoalDto>>("/api/goals", TestContext.Current.CancellationToken))!;
        Assert.Equal("50.00", Assert.Single(stored, g => g.Id == personal.Id).CurrentAmount);
    }

    [Fact]
    public async Task Neither_or_both_amounts_are_refused_by_the_validator()
    {
        using var member = await CreateUserClientAsync();
        var goal = await PostAsync<GoalDto>(member, "/api/goals", new { name = "Bike", targetAmount = "800.00" });

        await AssertValidationErrorAsync(await PatchAsync(member, goal.Id, new { }), "currentAmount");
        await AssertValidationErrorAsync(await PatchAsync(member, goal.Id, new { currentAmount = "10.00", delta = "5.00" }), "delta");
        await AssertValidationErrorAsync(await PatchAsync(member, goal.Id, new { currentAmount = "-1.00" }), "currentAmount");
    }

    [Fact]
    public async Task A_partner_moves_a_shared_goal_with_a_write_token_and_the_activity_names_the_token()
    {
        await using var on = await ApiTokensOnAsync();
        using var pair = await CreateHouseholdPairAsync();
        var goal = await PostAsync<GoalDto>(
            pair.OwnerClient,
            "/api/goals",
            new { name = "Holiday", targetAmount = "2000.00", currentAmount = "300.00", scope = "shared", householdId = pair.HouseholdId });
        using var reader = TokenClient((await IssueTokenAsync(pair.Partner.Id)).Token);
        using var script = TokenClient((await IssueTokenAsync(pair.Partner.Id, access: TokenAccess.ReadWrite, name: "Home Assistant")).Token);

        await AssertProblemAsync(await PatchAsync(reader, goal.Id, new { delta = "50.00" }), HttpStatusCode.Forbidden, "token.notAllowed");
        var moved = await ReadOkAsync<GoalDto>(await PatchAsync(script, goal.Id, new { delta = "50.00" }));

        Assert.Equal("350.00", moved.CurrentAmount);
        var events = (await pair.OwnerClient.GetFromJsonAsync<PageDto<AuditDto>>(
            $"/api/households/{pair.HouseholdId}/audit?pageSize=50",
            TestContext.Current.CancellationToken))!.Items;
        var updated = Assert.Single(events, e => e.EntityKind == "goal" && e.Action == "updated" && e.EntityId == goal.Id);
        Assert.Equal("Home Assistant", updated.ViaToken);
    }

    [Fact]
    public async Task A_retried_delta_with_the_same_idempotency_key_is_added_once()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var browser = await LoginAsync(user);
        var goal = await PostAsync<GoalDto>(browser, "/api/goals", new { name = "Holiday", targetAmount = "2000.00", currentAmount = "100.00" });
        using var script = TokenClient((await IssueTokenAsync(user.Id, access: TokenAccess.ReadWrite)).Token);

        var first = await PatchAsync(script, goal.Id, new { delta = "25.00" }, "save-1");
        var retried = await PatchAsync(script, goal.Id, new { delta = "25.00" }, "save-1");
        var reused = await PatchAsync(script, goal.Id, new { delta = "30.00" }, "save-1");

        Assert.Equal("125.00", (await ReadOkAsync<GoalDto>(first)).CurrentAmount);
        Assert.Equal("125.00", (await ReadOkAsync<GoalDto>(retried)).CurrentAmount);
        Assert.Equal(["true"], retried.Headers.GetValues(ApiIdempotencyKey.ReplayedHeaderName));
        await AssertProblemAsync(reused, HttpStatusCode.Conflict, "idempotency.keyReused");
        var stored = Assert.Single((await browser.GetFromJsonAsync<List<GoalDto>>("/api/goals", TestContext.Current.CancellationToken))!);
        Assert.Equal("125.00", stored.CurrentAmount);
    }

    private static Task<HttpResponseMessage> PatchAsync(HttpClient client, Guid goalId, object body, string? idempotencyKey = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/goals/{goalId}/progress") { Content = JsonContent.Create(body) };
        if (idempotencyKey is not null)
        {
            request.Headers.Add(ApiIdempotencyKey.HeaderName, idempotencyKey);
        }

        return client.SendAsync(request, TestContext.Current.CancellationToken);
    }

    private sealed record GoalDto(Guid Id, string Name, string TargetAmount, string CurrentAmount, string? ProgressAmount);

    private sealed record AuditDto(Guid Id, string? ViaToken, string Action, string EntityKind, Guid? EntityId);
}
