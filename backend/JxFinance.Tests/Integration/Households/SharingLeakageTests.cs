using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Households;

[Collection<IntegrationCollection>]
public sealed class SharingLeakageTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_shared_account_and_its_transactions_are_visible_to_household_members_only()
    {
        var member = await CreateUserAsync();
        var household = await CreateHouseholdAsync(member);
        var account = await CreateAccountAsync(householdId: household);
        var transaction = await CreateExpenseAsync(Client, account, "42.00");

        using var memberClient = await LoginAsync(member);
        var memberAccounts = await memberClient.GetFromJsonAsync<List<IdDto>>("/api/accounts");
        Assert.Contains(memberAccounts!, a => a.Id == account);
        Assert.Equal(HttpStatusCode.OK, (await memberClient.GetAsync($"/api/transactions/{transaction}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await memberClient.GetAsync($"/api/households/{household}")).StatusCode);

        using var outsiderClient = await CreateUserClientAsync();
        var outsiderAccounts = await outsiderClient.GetFromJsonAsync<List<IdDto>>("/api/accounts");
        Assert.DoesNotContain(outsiderAccounts!, a => a.Id == account);
        Assert.Equal(HttpStatusCode.NotFound, (await outsiderClient.GetAsync($"/api/transactions/{transaction}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outsiderClient.GetAsync($"/api/accounts/{account}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outsiderClient.GetAsync($"/api/households/{household}")).StatusCode);
        var outsiderHouseholds = await outsiderClient.GetFromJsonAsync<List<IdDto>>("/api/households");
        Assert.DoesNotContain(outsiderHouseholds!, h => h.Id == household);
    }

    [Fact]
    public async Task Creating_a_shared_account_in_a_household_you_do_not_belong_to_is_rejected()
    {
        var household = await CreateHouseholdAsync();
        using var outsiderClient = await CreateUserClientAsync();

        var response = await outsiderClient.PostAsJsonAsync(
            "/api/accounts",
            new { name = "Should fail", type = "checking", startingBalance = "0.00", scope = "shared", householdId = household });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Only_the_owner_can_rescope_an_account_and_rescoping_hides_its_history_from_members()
    {
        var member = await CreateUserAsync();
        using var memberClient = await LoginAsync(member);
        var household = await CreateHouseholdAsync(member);
        var account = await CreateAccountAsync("100.00", householdId: household);
        var transaction = await CreateExpenseAsync(memberClient, account, "10.00");
        var makePersonal = new { name = "Now personal", type = "checking", startingBalance = "100.00", scope = "personal" };

        var byMember = await memberClient.PutAsJsonAsync($"/api/accounts/{account}", makePersonal);
        Assert.Equal(HttpStatusCode.Forbidden, byMember.StatusCode);

        (await Client.PutAsJsonAsync($"/api/accounts/{account}", makePersonal)).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.NotFound, (await memberClient.GetAsync($"/api/transactions/{transaction}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await memberClient.DeleteAsync($"/api/transactions/{transaction}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync($"/api/transactions/{transaction}")).StatusCode);
    }

    [Fact]
    public async Task A_member_cannot_delete_a_transfer_that_touches_an_account_they_cannot_see()
    {
        var member = await CreateUserAsync();
        using var memberClient = await LoginAsync(member);
        var household = await CreateHouseholdAsync(member);
        var shared = await CreateAccountAsync("100.00", householdId: household);
        var personal = await CreateAccountAsync("100.00");
        var transfer = await PostAsync<IdDto>(
            Client,
            "/api/transfers",
            new { fromAccountId = personal, toAccountId = shared, amount = "20.00", date = "2026-09-01" });

        var response = await memberClient.DeleteAsync($"/api/transfers/{transfer.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task A_removed_member_loses_shared_history_but_their_entries_stay()
    {
        var member = await CreateUserAsync();
        using var memberClient = await LoginAsync(member);
        var household = await CreateHouseholdAsync(member);
        var shared = await CreateAccountAsync("100.00", householdId: household);
        var transaction = await CreateExpenseAsync(memberClient, shared, "5.00");

        (await Client.DeleteAsync($"/api/households/{household}/members/{member.Id}")).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.NotFound, (await memberClient.GetAsync($"/api/accounts/{shared}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await memberClient.GetAsync($"/api/transactions/{transaction}")).StatusCode);
        Assert.Equal("95.00", await CurrentBalanceAsync(shared));
    }

    [Fact]
    public async Task Removing_a_member_makes_their_shared_accounts_and_categories_personal_again()
    {
        var member = await CreateUserAsync();
        using var memberClient = await LoginAsync(member);
        var household = await CreateHouseholdAsync(member);
        var membersAccount = await CreateAccountAsync("50.00", householdId: household, client: memberClient);
        var membersCategory = (await PostAsync<IdDto>(
            memberClient,
            "/api/categories",
            new { name = $"Shared {Guid.NewGuid():N}", type = "expense", scope = "shared", householdId = household })).Id;
        var ownersAccount = await CreateAccountAsync("10.00", householdId: household);
        Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync($"/api/accounts/{membersAccount}")).StatusCode);

        (await Client.DeleteAsync($"/api/households/{household}/members/{member.Id}")).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync($"/api/accounts/{membersAccount}")).StatusCode);
        var ownersCategories = await Client.GetFromJsonAsync<List<IdDto>>("/api/categories");
        Assert.DoesNotContain(ownersCategories!, c => c.Id == membersCategory);
        Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync($"/api/accounts/{ownersAccount}")).StatusCode);

        var kept = await memberClient.GetFromJsonAsync<ScopeDto>($"/api/accounts/{membersAccount}");
        Assert.Equal("personal", kept!.Scope);
        Assert.Null(kept.HouseholdId);
        var membersCategories = await memberClient.GetFromJsonAsync<List<ScopeDto>>("/api/categories");
        var keptCategory = Assert.Single(membersCategories!, c => c.Id == membersCategory);
        Assert.Equal("personal", keptCategory.Scope);
    }

    private sealed record ScopeDto(Guid Id, string Scope, Guid? HouseholdId);

    private static async Task<Guid> CreateExpenseAsync(HttpClient client, Guid accountId, string amount) =>
        (await PostAsync<IdDto>(
            client,
            "/api/transactions",
            new { accountId, type = "expense", amount, date = "2026-09-01" })).Id;
}
