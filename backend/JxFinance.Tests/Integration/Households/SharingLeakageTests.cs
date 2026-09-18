using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;
using FastEndpoints.Testing;

namespace JxFinance.Tests.Integration.Households;

[Collection<IntegrationCollection>]
public sealed class SharingLeakageTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_shared_account_and_its_transactions_are_visible_to_household_members_only()
    {
        var householdResponse = await Client.PostAsJsonAsync(
            "/api/households",
            new { name = $"Leakage household {Guid.NewGuid():N}" });
        householdResponse.EnsureSuccessStatusCode();
        var household = (await householdResponse.Content.ReadFromJsonAsync<HouseholdDto>())!;

        var (memberEmail, memberPassword) = await CreateUserAsync("leakage-member");
        await Client.PostAsJsonAsync(
            $"/api/households/{household.Id}/members",
            new { email = memberEmail, role = "member" });

        var (outsiderEmail, outsiderPassword) = await CreateUserAsync("leakage-outsider");

        var accountResponse = await Client.PostAsJsonAsync(
            "/api/accounts",
            new
            {
                name = $"Shared account {Guid.NewGuid():N}",
                type = "checking",
                startingBalance = "0.00",
                scope = "shared",
                householdId = household.Id,
            });
        accountResponse.EnsureSuccessStatusCode();
        var account = (await accountResponse.Content.ReadFromJsonAsync<AccountDto>())!;
        Assert.Equal("shared", account.Scope);

        var transactionResponse = await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account.Id,
                type = "expense",
                amount = "42.00",
                date = "2026-06-15",
                description = "Shared groceries",
            });
        transactionResponse.EnsureSuccessStatusCode();
        var transaction = (await transactionResponse.Content.ReadFromJsonAsync<TransactionDto>())!;

        using var memberClient = await LoginAsAsync(memberEmail, memberPassword, "10.1.0");
        var memberAccounts = await memberClient.GetFromJsonAsync<List<AccountDto>>("/api/accounts");
        Assert.Contains(memberAccounts!, a => a.Id == account.Id);

        var memberTransaction = await memberClient.GetAsync($"/api/transactions/{transaction.Id}");
        Assert.Equal(HttpStatusCode.OK, memberTransaction.StatusCode);

        var memberHousehold = await memberClient.GetAsync($"/api/households/{household.Id}");
        Assert.Equal(HttpStatusCode.OK, memberHousehold.StatusCode);

        using var outsiderClient = await LoginAsAsync(outsiderEmail, outsiderPassword, "10.1.1");
        var outsiderAccounts = await outsiderClient.GetFromJsonAsync<List<AccountDto>>("/api/accounts");
        Assert.DoesNotContain(outsiderAccounts!, a => a.Id == account.Id);

        var outsiderTransaction = await outsiderClient.GetAsync($"/api/transactions/{transaction.Id}");
        Assert.Equal(HttpStatusCode.NotFound, outsiderTransaction.StatusCode);

        var outsiderAccountDirect = await outsiderClient.GetAsync($"/api/accounts/{account.Id}");
        Assert.Equal(HttpStatusCode.NotFound, outsiderAccountDirect.StatusCode);

        var outsiderHousehold = await outsiderClient.GetAsync($"/api/households/{household.Id}");
        Assert.Equal(HttpStatusCode.NotFound, outsiderHousehold.StatusCode);

        var outsiderHouseholds = await outsiderClient.GetFromJsonAsync<List<HouseholdDto>>("/api/households");
        Assert.DoesNotContain(outsiderHouseholds!, h => h.Id == household.Id);
    }

    [Fact]
    public async Task Creating_a_shared_account_in_a_household_you_do_not_belong_to_is_rejected()
    {
        var (outsiderEmail, outsiderPassword) = await CreateUserAsync("leakage-create-outsider");

        var householdResponse = await Client.PostAsJsonAsync(
            "/api/households",
            new { name = $"Not yours {Guid.NewGuid():N}" });
        var household = (await householdResponse.Content.ReadFromJsonAsync<HouseholdDto>())!;

        using var outsiderClient = await LoginAsAsync(outsiderEmail, outsiderPassword, "10.1.2");
        var response = await outsiderClient.PostAsJsonAsync(
            "/api/accounts",
            new
            {
                name = "Should fail",
                type = "checking",
                startingBalance = "0.00",
                scope = "shared",
                householdId = household.Id,
            });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<(string Email, string Password)> CreateUserAsync(string label)
    {
        var email = $"{label}-{Guid.NewGuid():N}@localhost";
        const string password = "Leakage-Password-123!";
        var response = await Client.PostAsJsonAsync(
            "/api/users",
            new { email, displayName = label, role = "Member", password });
        response.EnsureSuccessStatusCode();
        return (email, password);
    }

    private async Task<HttpClient> LoginAsAsync(string email, string password, string ipPrefix)
    {
        var client = CreateClient(new ClientOptions { HandleCookies = true });
        client.DefaultRequestHeaders.Add("X-Forwarded-For", $"{ipPrefix}.{Random.Shared.Next(2, 254)}");
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password, rememberMe = false });
        response.EnsureSuccessStatusCode();
        return client;
    }

    private sealed record AccountDto(Guid Id, string Scope);

    private sealed record TransactionDto(Guid Id);

    private sealed record HouseholdDto(Guid Id, string Name);
}
