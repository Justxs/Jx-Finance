using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Accounts;

[Collection<IntegrationCollection>]
public sealed class AccountRestoreTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string ScopeHeader = "X-Active-Household";

    [Fact]
    public async Task An_archived_account_is_listed_and_restoring_it_brings_back_everything_posted_to_it()
    {
        using var owner = await CreateUserClientAsync();
        var accountId = await CreateAccountAsync("100.00", client: owner);
        var otherId = await CreateAccountAsync("0.00", client: owner);
        var entry = await CreateTransactionAsync(owner, accountId, null, "income", "50.00", "2026-06-01");
        var transfer = await PostAsync<TransferDto>(
            owner,
            "/api/transfers",
            new { fromAccountId = accountId, toAccountId = otherId, amount = "30.00", date = "2026-06-02" });
        var goal = await PostAsync<GoalDto>(
            owner,
            "/api/goals",
            new { name = "Funded", targetAmount = "1000.00", funding = "account", fundingAccountId = accountId });

        Assert.Equal(HttpStatusCode.NoContent, (await owner.DeleteAsync($"/api/accounts/{accountId}", TestContext.Current.CancellationToken)).StatusCode);

        var archived = await ArchivedAsync(owner);
        var listed = Assert.Single(archived, a => a.Id == accountId);
        Assert.True(listed.CanRestore);
        Assert.Equal("100.00", listed.StartingBalance);
        Assert.DoesNotContain(archived, a => a.Id == otherId);
        Assert.Null(await ProgressAsync(owner, goal.Id));

        var restore = await owner.PostAsync($"/api/accounts/{accountId}/restore", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, restore.StatusCode);
        var restored = await restore.Content.ReadFromJsonAsync<AccountDto>(TestContext.Current.CancellationToken);
        Assert.Equal("120.00", restored!.CurrentBalance);
        Assert.DoesNotContain(await ArchivedAsync(owner), a => a.Id == accountId);
        Assert.Contains(await owner.GetFromJsonAsync<List<AccountDto>>("/api/accounts", TestContext.Current.CancellationToken) ?? [], a => a.Id == accountId);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync($"/api/transactions/{entry.Id}", TestContext.Current.CancellationToken)).StatusCode);
        var transfers = await owner.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?pageSize=200", TestContext.Current.CancellationToken);
        Assert.Contains(transfers!.Items, t => t.Id == transfer.Id);
        Assert.Equal("120.00", await ProgressAsync(owner, goal.Id));
    }

    [Fact]
    public async Task Restoring_an_active_account_changes_nothing_and_answers_ok()
    {
        using var owner = await CreateUserClientAsync();
        var accountId = await CreateAccountAsync("10.00", client: owner);
        await owner.DeleteAsync($"/api/accounts/{accountId}", TestContext.Current.CancellationToken);

        var first = await owner.PostAsync($"/api/accounts/{accountId}/restore", null, TestContext.Current.CancellationToken);
        var second = await owner.PostAsync($"/api/accounts/{accountId}/restore", null, TestContext.Current.CancellationToken);
        var neverArchived = await CreateAccountAsync("5.00", client: owner);
        var third = await owner.PostAsync($"/api/accounts/{neverArchived}/restore", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal("10.00", (await second.Content.ReadFromJsonAsync<AccountDto>(TestContext.Current.CancellationToken))!.CurrentBalance);
        Assert.Equal(HttpStatusCode.OK, third.StatusCode);
    }

    [Fact]
    public async Task An_unknown_account_answers_404()
    {
        using var owner = await CreateUserClientAsync();

        var response = await owner.PostAsync($"/api/accounts/{Guid.NewGuid()}/restore", null, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.NotFound, "resource.notFound");
    }

    [Fact]
    public async Task Another_users_archived_account_is_neither_listed_nor_restorable()
    {
        using var owner = await CreateUserClientAsync();
        using var stranger = await CreateUserClientAsync();
        var accountId = await CreateAccountAsync("10.00", client: owner);
        await owner.DeleteAsync($"/api/accounts/{accountId}", TestContext.Current.CancellationToken);

        var response = await stranger.PostAsync($"/api/accounts/{accountId}/restore", null, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.NotFound, "resource.notFound");
        Assert.DoesNotContain(await ArchivedAsync(stranger), a => a.Id == accountId);
        Assert.Contains(await ArchivedAsync(owner), a => a.Id == accountId);
    }

    [Fact]
    public async Task A_household_member_sees_a_shared_archived_account_but_only_the_owner_restores_it()
    {
        var ownerUser = await CreateUserAsync();
        var memberUser = await CreateUserAsync();
        using var owner = await LoginAsync(ownerUser);
        using var member = await LoginAsync(memberUser);
        var household = await NewHouseholdAsync(owner, memberUser);
        var accountId = await CreateAccountAsync("10.00", householdId: household, client: owner);
        await owner.DeleteAsync($"/api/accounts/{accountId}", TestContext.Current.CancellationToken);

        var seen = Assert.Single(await ArchivedAsync(member), a => a.Id == accountId);
        var response = await member.PostAsync($"/api/accounts/{accountId}/restore", null, TestContext.Current.CancellationToken);

        Assert.False(seen.CanRestore);
        await AssertProblemAsync(response, HttpStatusCode.Forbidden, "access.forbidden");
        Assert.Contains(await ArchivedAsync(owner), a => a.Id == accountId);

        var restored = await owner.PostAsync($"/api/accounts/{accountId}/restore", null, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, restored.StatusCode);
        Assert.Equal("shared", (await restored.Content.ReadFromJsonAsync<AccountDto>(TestContext.Current.CancellationToken))!.Scope);
        Assert.Equal(HttpStatusCode.OK, (await member.GetAsync($"/api/accounts/{accountId}", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task The_active_household_narrows_the_list_and_the_restore()
    {
        using var owner = await CreateUserClientAsync();
        var first = await NewHouseholdAsync(owner);
        var second = await NewHouseholdAsync(owner);
        var inFirst = await CreateAccountAsync("1.00", householdId: first, client: owner);
        var inSecond = await CreateAccountAsync("2.00", householdId: second, client: owner);
        var personal = await CreateAccountAsync("3.00", client: owner);
        foreach (var id in new[] { inFirst, inSecond, personal })
            await owner.DeleteAsync($"/api/accounts/{id}", TestContext.Current.CancellationToken);

        var listed = await ReadAsync<List<ArchivedAccountDto>>(
            await SendAsync(owner, HttpMethod.Get, "/api/accounts/archived", first));
        var hidden = await SendAsync(owner, HttpMethod.Post, $"/api/accounts/{inSecond}/restore", first);
        var visible = await SendAsync(owner, HttpMethod.Post, $"/api/accounts/{inFirst}/restore", first);

        Assert.Contains(listed, a => a.Id == inFirst);
        Assert.Contains(listed, a => a.Id == personal);
        Assert.DoesNotContain(listed, a => a.Id == inSecond);
        await AssertProblemAsync(hidden, HttpStatusCode.NotFound, "resource.notFound");
        Assert.Equal(HttpStatusCode.OK, visible.StatusCode);
        Assert.Contains(await ArchivedAsync(owner), a => a.Id == inSecond);
    }

    [Fact]
    public async Task Deleting_the_household_makes_its_archived_accounts_personal_and_hides_them_from_members()
    {
        var memberUser = await CreateUserAsync();
        using var owner = await CreateUserClientAsync();
        using var member = await LoginAsync(memberUser);
        var household = await NewHouseholdAsync(owner, memberUser);
        var accountId = await CreateAccountAsync("10.00", householdId: household, client: owner);
        await owner.DeleteAsync($"/api/accounts/{accountId}", TestContext.Current.CancellationToken);
        var before = Assert.Single(await ArchivedAsync(owner), a => a.Id == accountId);

        Assert.Equal(HttpStatusCode.NoContent, (await owner.DeleteAsync($"/api/households/{household}", TestContext.Current.CancellationToken)).StatusCode);

        var after = Assert.Single(await ArchivedAsync(owner), a => a.Id == accountId);
        Assert.Equal("personal", after.Scope);
        Assert.Null(after.HouseholdId);
        Assert.Equal(before.ArchivedAt, after.ArchivedAt);
        Assert.DoesNotContain(await ArchivedAsync(member), a => a.Id == accountId);

        var restored = await owner.PostAsync($"/api/accounts/{accountId}/restore", null, TestContext.Current.CancellationToken);
        Assert.Equal("personal", (await restored.Content.ReadFromJsonAsync<AccountDto>(TestContext.Current.CancellationToken))!.Scope);
        Assert.Equal(HttpStatusCode.NotFound, (await member.GetAsync($"/api/accounts/{accountId}", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task Removing_the_owner_from_the_household_makes_their_archived_account_personal()
    {
        var ownerUser = await CreateUserAsync();
        using var householdOwner = await CreateUserClientAsync();
        using var owner = await LoginAsync(ownerUser);
        var household = await NewHouseholdAsync(householdOwner, ownerUser);
        var accountId = await CreateAccountAsync("10.00", householdId: household, client: owner);
        await owner.DeleteAsync($"/api/accounts/{accountId}", TestContext.Current.CancellationToken);

        var removed = await householdOwner.DeleteAsync($"/api/households/{household}/members/{ownerUser.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, removed.StatusCode);
        Assert.DoesNotContain(await ArchivedAsync(householdOwner), a => a.Id == accountId);
        var restored = await owner.PostAsync($"/api/accounts/{accountId}/restore", null, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, restored.StatusCode);
        Assert.Equal("personal", (await restored.Content.ReadFromJsonAsync<AccountDto>(TestContext.Current.CancellationToken))!.Scope);
        Assert.Equal(HttpStatusCode.NotFound, (await householdOwner.GetAsync($"/api/accounts/{accountId}", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task An_archived_account_left_shared_into_a_household_its_owner_left_comes_back_personal()
    {
        var ownerUser = await CreateUserAsync();
        using var householdOwner = await CreateUserClientAsync();
        using var owner = await LoginAsync(ownerUser);
        var left = await NewHouseholdAsync(householdOwner);
        var accountId = await CreateAccountAsync("10.00", client: owner);
        await owner.DeleteAsync($"/api/accounts/{accountId}", TestContext.Current.CancellationToken);
        await ShareArchivedAsync(accountId, left);

        Assert.DoesNotContain(await ArchivedAsync(householdOwner), a => a.Id == accountId);
        var restored = await owner.PostAsync($"/api/accounts/{accountId}/restore", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, restored.StatusCode);
        var account = await restored.Content.ReadFromJsonAsync<AccountDto>(TestContext.Current.CancellationToken);
        Assert.Equal("personal", account!.Scope);
        Assert.Null(account.HouseholdId);
        Assert.Equal(HttpStatusCode.NotFound, (await householdOwner.GetAsync($"/api/accounts/{accountId}", TestContext.Current.CancellationToken)).StatusCode);
    }

    private async Task ShareArchivedAsync(Guid accountId, Guid householdId) =>
        Assert.Equal(1, await SqlAsync($"""UPDATE "Accounts" SET "Scope" = 1, "HouseholdId" = {householdId} WHERE "Id" = {accountId}"""));

    private static async Task<string?> ProgressAsync(HttpClient client, Guid goalId) =>
        (await client.GetFromJsonAsync<List<GoalDto>>("/api/goals"))!.Single(g => g.Id == goalId).ProgressAmount;

    private static async Task<List<ArchivedAccountDto>> ArchivedAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<ArchivedAccountDto>>("/api/accounts/archived"))!;

    private static async Task<Guid> NewHouseholdAsync(HttpClient client, params TestUser[] members)
    {
        var household = await PostAsync<IdDto>(client, "/api/households", new { name = $"Household {Guid.NewGuid():N}" });
        foreach (var member in members)
            await PostAsync<IdDto>(client, $"/api/households/{household.Id}/members", new { email = member.Email, role = "member" });
        return household.Id;
    }

    private static Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string url, Guid household)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add(ScopeHeader, household.ToString());
        return client.SendAsync(request);
    }

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }

    private sealed record ArchivedAccountDto(
        Guid Id,
        string Name,
        string StartingBalance,
        string Scope,
        Guid? HouseholdId,
        DateTimeOffset ArchivedAt,
        bool CanRestore);

    private sealed record GoalDto(Guid Id, string? ProgressAmount);
}
