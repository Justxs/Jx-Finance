using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Households;

[Collection<IntegrationCollection>]
public sealed class HouseholdOwnershipTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Owner_can_rename_the_household()
    {
        var household = await CreateHouseholdAsync();

        var response = await Client.PutAsJsonAsync($"/api/households/{household}", new { name = "Renamed" });

        response.EnsureSuccessStatusCode();
        Assert.Equal("Renamed", (await response.Content.ReadFromJsonAsync<HouseholdDto>())!.Name);
    }

    [Fact]
    public async Task A_promoted_member_gains_owner_rights()
    {
        var member = await CreateUserAsync();
        var household = await CreateHouseholdAsync(member);
        using var memberClient = await LoginAsync(member);

        var promote = await Client.PutAsJsonAsync($"/api/households/{household}/members/{member.Id}", new { role = "owner" });
        promote.EnsureSuccessStatusCode();

        var rename = await memberClient.PutAsJsonAsync($"/api/households/{household}", new { name = "Renamed by new owner" });
        Assert.Equal(HttpStatusCode.OK, rename.StatusCode);
    }

    [Fact]
    public async Task The_last_owner_cannot_be_demoted()
    {
        var household = await CreateHouseholdAsync();
        var me = await Client.GetFromJsonAsync<IdDto>("/api/auth/me");

        var response = await Client.PutAsJsonAsync($"/api/households/{household}/members/{me!.Id}", new { role = "member" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task A_member_cannot_change_roles()
    {
        var member = await CreateUserAsync();
        var household = await CreateHouseholdAsync(member);
        using var memberClient = await LoginAsync(member);

        var response = await memberClient.PutAsJsonAsync($"/api/households/{household}/members/{member.Id}", new { role = "owner" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Adding_the_same_user_twice_conflicts()
    {
        var member = await CreateUserAsync();
        var household = await CreateHouseholdAsync(member);

        var response = await Client.PostAsJsonAsync($"/api/households/{household}/members", new { email = member.Email, role = "member" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Deleting_a_household_returns_its_accounts_to_their_owner_and_hides_them_from_members()
    {
        var member = await CreateUserAsync();
        var household = await CreateHouseholdAsync(member);
        var account = await CreateAccountAsync("100.00", householdId: household);
        using var memberClient = await LoginAsync(member);

        var delete = await Client.DeleteAsync($"/api/households/{household}");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal("personal", (await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{account}"))!.Scope);
        Assert.Equal(HttpStatusCode.NotFound, (await memberClient.GetAsync($"/api/accounts/{account}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync($"/api/households/{household}")).StatusCode);
    }

    private sealed record HouseholdDto(Guid Id, string Name);

    private sealed record AccountDto(Guid Id, string Scope);
}
