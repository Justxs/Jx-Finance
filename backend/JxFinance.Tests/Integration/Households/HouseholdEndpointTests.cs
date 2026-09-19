using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Households;

[Collection<IntegrationCollection>]
public sealed class HouseholdEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Create_household_makes_the_creator_its_owner()
    {
        var household = await PostAsync<HouseholdDto>(Client, "/api/households", new { name = $"Household {Guid.NewGuid():N}" });

        Assert.Equal("owner", household.MyRole);
        Assert.Equal("owner", Assert.Single(household.Members).Role);

        var households = await Client.GetFromJsonAsync<List<HouseholdDto>>("/api/households");
        Assert.Contains(households!, h => h.Id == household.Id);
    }

    [Fact]
    public async Task Owner_can_add_an_existing_user_by_email()
    {
        var household = await CreateHouseholdAsync();
        var user = await CreateUserAsync();

        var updated = await PostAsync<HouseholdDto>(
            Client,
            $"/api/households/{household}/members",
            new { email = user.Email, role = "member" });

        Assert.Equal(2, updated.Members.Count);
        Assert.Contains(updated.Members, m => m.Email == user.Email && m.Role == "member");
    }

    [Fact]
    public async Task Adding_an_unknown_email_fails()
    {
        var household = await CreateHouseholdAsync();

        var response = await Client.PostAsJsonAsync(
            $"/api/households/{household}/members",
            new { email = $"nobody-{Guid.NewGuid():N}@localhost", role = "member" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task A_member_can_view_but_not_rename_add_members_or_delete_the_household()
    {
        var member = await CreateUserAsync();
        var other = await CreateUserAsync();
        var household = await CreateHouseholdAsync(member);
        using var memberClient = await LoginAsync(member);

        var renameResponse = await memberClient.PutAsJsonAsync(
            $"/api/households/{household}",
            new { id = household, name = "Renamed by member" });
        Assert.Equal(HttpStatusCode.Forbidden, renameResponse.StatusCode);

        var addResponse = await memberClient.PostAsJsonAsync(
            $"/api/households/{household}/members",
            new { email = other.Email, role = "member" });
        Assert.Equal(HttpStatusCode.Forbidden, addResponse.StatusCode);

        var deleteResponse = await memberClient.DeleteAsync($"/api/households/{household}");
        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);

        var getResponse = await memberClient.GetAsync($"/api/households/{household}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
    }

    [Fact]
    public async Task Cannot_remove_the_last_owner()
    {
        var household = await CreateHouseholdAsync();
        var me = await Client.GetFromJsonAsync<IdDto>("/api/auth/me");

        var response = await Client.DeleteAsync($"/api/households/{household}/members/{me!.Id}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private sealed record HouseholdMemberDto(Guid UserId, string Email, string DisplayName, string Role);

    private sealed record HouseholdDto(Guid Id, string Name, string MyRole, List<HouseholdMemberDto> Members);
}
