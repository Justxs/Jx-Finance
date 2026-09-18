using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;
using FastEndpoints.Testing;

namespace JxFinance.Tests.Integration.Households;

[Collection<IntegrationCollection>]
public sealed class HouseholdEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Create_household_makes_the_creator_its_owner()
    {
        var household = await CreateHouseholdAsync($"Household {Guid.NewGuid():N}");

        Assert.Equal("owner", household.MyRole);
        Assert.Single(household.Members);
        Assert.Equal("owner", household.Members[0].Role);

        var households = await Client.GetFromJsonAsync<List<HouseholdDto>>("/api/households");
        Assert.Contains(households!, h => h.Id == household.Id);
    }

    [Fact]
    public async Task Owner_can_add_an_existing_user_by_email()
    {
        var household = await CreateHouseholdAsync($"Household {Guid.NewGuid():N}");
        var (email, _) = await CreateMemberUserAsync("household-add");

        var addResponse = await Client.PostAsJsonAsync(
            $"/api/households/{household.Id}/members",
            new { email, role = "member" });
        addResponse.EnsureSuccessStatusCode();
        var updated = await addResponse.Content.ReadFromJsonAsync<HouseholdDto>();
        Assert.Equal(2, updated!.Members.Count);
        Assert.Contains(updated.Members, m => m.Email == email && m.Role == "member");
    }

    [Fact]
    public async Task Adding_an_unknown_email_fails()
    {
        var household = await CreateHouseholdAsync($"Household {Guid.NewGuid():N}");

        var response = await Client.PostAsJsonAsync(
            $"/api/households/{household.Id}/members",
            new { email = $"nobody-{Guid.NewGuid():N}@localhost", role = "member" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task A_member_cannot_rename_add_members_or_delete_the_household()
    {
        var household = await CreateHouseholdAsync($"Household {Guid.NewGuid():N}");
        var (email, password) = await CreateMemberUserAsync("household-nonowner");
        await Client.PostAsJsonAsync($"/api/households/{household.Id}/members", new { email, role = "member" });

        using var memberClient = await LoginAsAsync(email, password, "10.0.5");

        var renameResponse = await memberClient.PutAsJsonAsync(
            $"/api/households/{household.Id}",
            new { id = household.Id, name = "Renamed by member" });
        Assert.Equal(HttpStatusCode.Forbidden, renameResponse.StatusCode);

        var (otherEmail, _) = await CreateMemberUserAsync("household-third");
        var addResponse = await memberClient.PostAsJsonAsync(
            $"/api/households/{household.Id}/members",
            new { email = otherEmail, role = "member" });
        Assert.Equal(HttpStatusCode.Forbidden, addResponse.StatusCode);

        var deleteResponse = await memberClient.DeleteAsync($"/api/households/{household.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);

        var getResponse = await memberClient.GetAsync($"/api/households/{household.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
    }

    [Fact]
    public async Task Cannot_remove_the_last_owner()
    {
        var household = await CreateHouseholdAsync($"Household {Guid.NewGuid():N}");
        var me = await Client.GetFromJsonAsync<MeDto>("/api/auth/me");

        var response = await Client.DeleteAsync($"/api/households/{household.Id}/members/{me!.Id}");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<HouseholdDto> CreateHouseholdAsync(string name)
    {
        var response = await Client.PostAsJsonAsync("/api/households", new { name });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<HouseholdDto>())!;
    }

    private async Task<(string Email, string Password)> CreateMemberUserAsync(string label)
    {
        var email = $"{label}-{Guid.NewGuid():N}@localhost";
        const string password = "Household-Password-123!";
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

    private sealed record MeDto(Guid Id);

    private sealed record HouseholdMemberDto(Guid UserId, string Email, string DisplayName, string Role);

    private sealed record HouseholdDto(Guid Id, string Name, string MyRole, List<HouseholdMemberDto> Members);
}
