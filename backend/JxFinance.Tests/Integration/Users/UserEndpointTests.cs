using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Users;

[Collection<IntegrationCollection>]
public sealed class UserEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Admin_can_create_list_and_change_role_of_a_user()
    {
        var createResponse = await Client.PostAsJsonAsync(
            "/api/users",
            new
            {
                email = $"member-{Guid.NewGuid():N}@localhost",
                displayName = "Member One",
                role = "Member",
                password = "Member-Password-123!",
            });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal("Member", created!.Role);
        Assert.True(created.IsActive);

        var users = await Client.GetFromJsonAsync<List<UserDto>>("/api/users");
        Assert.Contains(users!, u => u.Id == created.Id);

        var roleResponse = await Client.PutAsJsonAsync($"/api/users/{created.Id}/role", new { role = "Admin" });
        roleResponse.EnsureSuccessStatusCode();
        var updated = await roleResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal("Admin", updated!.Role);
    }

    [Fact]
    public async Task List_filters_by_search_role_and_status_and_sorts_by_email()
    {
        var marker = Guid.NewGuid().ToString("N")[..8];
        var ids = new Dictionary<string, Guid>();
        foreach (var (name, role) in new[] { ("b", "Member"), ("a", "Admin"), ("c", "Member") })
        {
            var user = await PostAsync<UserDto>(
                Client,
                "/api/users",
                new { email = $"{name}-{marker}@localhost", displayName = $"List {marker}", role, password = "List-Password-123!" });
            ids[name] = user.Id;
        }
        (await Client.PostAsync($"/api/users/{ids["c"]}/deactivate", null)).EnsureSuccessStatusCode();

        var sorted = await Client.GetFromJsonAsync<List<UserDto>>($"/api/users?search={marker}&sort=email&direction=desc");
        var admins = await Client.GetFromJsonAsync<List<UserDto>>($"/api/users?search={marker}&role=admin");
        var inactive = await Client.GetFromJsonAsync<List<UserDto>>($"/api/users?search={marker}&isActive=false");

        Assert.Equal([ids["c"], ids["b"], ids["a"]], sorted!.Select(u => u.Id));
        Assert.Equal([ids["a"]], admins!.Select(u => u.Id));
        Assert.Equal([ids["c"]], inactive!.Select(u => u.Id));
    }

    [Fact]
    public async Task Deactivated_user_can_no_longer_log_in()
    {
        var user = await CreateUserAsync();
        using var userClient = await LoginAsync(user);

        var deactivateResponse = await Client.PostAsync($"/api/users/{user.Id}/deactivate", null);
        Assert.Equal(HttpStatusCode.NoContent, deactivateResponse.StatusCode);

        var loginAfter = await userClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email = user.Email, password = user.Password, rememberMe = false });
        Assert.Equal(HttpStatusCode.Unauthorized, loginAfter.StatusCode);
    }

    [Fact]
    public async Task Role_change_revokes_the_existing_session()
    {
        var user = await CreateUserAsync("Admin");
        using var userClient = await LoginAsync(user);
        Assert.Equal(HttpStatusCode.OK, (await userClient.GetAsync("/api/users")).StatusCode);

        (await Client.PutAsJsonAsync($"/api/users/{user.Id}/role", new { role = "Member" })).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Unauthorized, (await userClient.GetAsync("/api/users")).StatusCode);
    }

    [Fact]
    public async Task Admin_cannot_change_own_role_or_deactivate_self()
    {
        var me = await Client.GetFromJsonAsync<IdDto>("/api/auth/me");

        var roleResponse = await Client.PutAsJsonAsync($"/api/users/{me!.Id}/role", new { role = "Member" });
        Assert.Equal(HttpStatusCode.Forbidden, roleResponse.StatusCode);

        var deactivateResponse = await Client.PostAsync($"/api/users/{me.Id}/deactivate", null);
        Assert.Equal(HttpStatusCode.Forbidden, deactivateResponse.StatusCode);
    }

    [Fact]
    public async Task Non_admin_cannot_list_users()
    {
        using var memberClient = await CreateUserClientAsync();

        var listResponse = await memberClient.GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.Forbidden, listResponse.StatusCode);
    }

    [Fact]
    public async Task Can_update_own_display_name_and_password()
    {
        const string newPassword = "Updated-Password-456!";
        var user = await CreateUserAsync();
        using var userClient = await LoginAsync(user);

        var updateResponse = await userClient.PutAsJsonAsync(
            "/api/users/me",
            new { displayName = "New Name", currentPassword = user.Password, newPassword });
        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal("New Name", updated!.DisplayName);

        var reloginOld = await userClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email = user.Email, password = user.Password, rememberMe = false });
        Assert.Equal(HttpStatusCode.Unauthorized, reloginOld.StatusCode);

        var reloginNew = await userClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email = user.Email, password = newPassword, rememberMe = false });
        Assert.Equal(HttpStatusCode.OK, reloginNew.StatusCode);
    }

    private sealed record UserDto(Guid Id, string Email, string DisplayName, string Role, bool IsActive);
}
