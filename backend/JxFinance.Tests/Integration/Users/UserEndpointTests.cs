using FastEndpoints.Testing;
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
        var email = $"member-{Guid.NewGuid():N}@localhost";
        var createResponse = await Client.PostAsJsonAsync(
            "/api/users",
            new { email, displayName = "Member One", role = "Member", password = "Member-Password-123!" });
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
    public async Task Deactivated_user_can_no_longer_log_in()
    {
        var email = $"deactivate-{Guid.NewGuid():N}@localhost";
        const string password = "Deactivate-Password-123!";
        var createResponse = await Client.PostAsJsonAsync(
            "/api/users",
            new { email, displayName = "To Deactivate", role = "Member", password });
        var created = await createResponse.Content.ReadFromJsonAsync<UserDto>();

        using var otherClient = CreateClient(
            new ClientOptions { HandleCookies = true });
        otherClient.DefaultRequestHeaders.Add("X-Forwarded-For", $"10.0.0.{Random.Shared.Next(2, 254)}");

        var loginBefore = await otherClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password, rememberMe = false });
        Assert.Equal(HttpStatusCode.OK, loginBefore.StatusCode);

        var deactivateResponse = await Client.PostAsync($"/api/users/{created!.Id}/deactivate", null);
        Assert.Equal(HttpStatusCode.NoContent, deactivateResponse.StatusCode);

        var loginAfter = await otherClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password, rememberMe = false });
        Assert.Equal(HttpStatusCode.Unauthorized, loginAfter.StatusCode);
    }

    [Fact]
    public async Task Admin_cannot_change_own_role_or_deactivate_self()
    {
        var me = await Client.GetFromJsonAsync<MeDto>("/api/auth/me");

        var roleResponse = await Client.PutAsJsonAsync($"/api/users/{me!.Id}/role", new { role = "Member" });
        Assert.Equal(HttpStatusCode.Forbidden, roleResponse.StatusCode);

        var deactivateResponse = await Client.PostAsync($"/api/users/{me.Id}/deactivate", null);
        Assert.Equal(HttpStatusCode.Forbidden, deactivateResponse.StatusCode);
    }

    [Fact]
    public async Task Non_admin_cannot_list_users()
    {
        var email = $"nonadmin-{Guid.NewGuid():N}@localhost";
        const string password = "NonAdmin-Password-123!";
        await Client.PostAsJsonAsync(
            "/api/users",
            new { email, displayName = "Non Admin", role = "Member", password });

        using var otherClient = CreateClient(
            new ClientOptions { HandleCookies = true });
        otherClient.DefaultRequestHeaders.Add("X-Forwarded-For", $"10.0.1.{Random.Shared.Next(2, 254)}");
        var loginResponse = await otherClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password, rememberMe = false });
        loginResponse.EnsureSuccessStatusCode();

        var listResponse = await otherClient.GetAsync("/api/users");
        Assert.Equal(HttpStatusCode.Forbidden, listResponse.StatusCode);
    }

    [Fact]
    public async Task Can_update_own_display_name_and_password()
    {
        var email = $"self-update-{Guid.NewGuid():N}@localhost";
        const string password = "SelfUpdate-Password-123!";
        await Client.PostAsJsonAsync(
            "/api/users",
            new { email, displayName = "Original Name", role = "Member", password });

        using var otherClient = CreateClient(
            new ClientOptions { HandleCookies = true });
        otherClient.DefaultRequestHeaders.Add("X-Forwarded-For", $"10.0.2.{Random.Shared.Next(2, 254)}");
        await otherClient.PostAsJsonAsync("/api/auth/login", new { email, password, rememberMe = false });

        var updateResponse = await otherClient.PutAsJsonAsync(
            "/api/users/me",
            new { displayName = "New Name", currentPassword = password, newPassword = "Updated-Password-456!" });
        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal("New Name", updated!.DisplayName);

        var reloginOld = await otherClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password, rememberMe = false });
        Assert.Equal(HttpStatusCode.Unauthorized, reloginOld.StatusCode);

        var reloginNew = await otherClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password = "Updated-Password-456!", rememberMe = false });
        Assert.Equal(HttpStatusCode.OK, reloginNew.StatusCode);
    }

    private sealed record UserDto(Guid Id, string Email, string DisplayName, string Role, bool IsActive);

    private sealed record MeDto(Guid Id);
}
