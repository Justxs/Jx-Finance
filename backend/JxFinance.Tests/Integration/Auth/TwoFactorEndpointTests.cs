using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Mvc.Testing;

namespace JxFinance.Tests.Integration.Auth;

[Collection(IntegrationCollection.Name)]
public sealed class TwoFactorEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Full_totp_enrollment_login_and_recovery_code_flow()
    {
        var email = $"twofactor-{Guid.NewGuid():N}@localhost";
        const string password = "TwoFactor-Password-123!";
        await Client.PostAsJsonAsync(
            "/api/users",
            new { email, displayName = "Two Factor User", role = "Member", password });

        using var userClient = Factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        userClient.DefaultRequestHeaders.Add("X-Forwarded-For", $"10.1.0.{Random.Shared.Next(2, 254)}");

        var initialLogin = await userClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password, rememberMe = false });
        var initialLoginBody = await initialLogin.Content.ReadFromJsonAsync<LoginDto>();
        Assert.False(initialLoginBody!.TwoFactorRequired);
        Assert.NotNull(initialLoginBody.Profile);

        var setupResponse = await userClient.PostAsync("/api/auth/2fa/setup", null);
        setupResponse.EnsureSuccessStatusCode();
        var setup = await setupResponse.Content.ReadFromJsonAsync<SetupDto>();
        Assert.False(string.IsNullOrWhiteSpace(setup!.SharedKey));

        var code = Totp.GenerateCode(setup.SharedKey);
        var enableResponse = await userClient.PostAsJsonAsync("/api/auth/2fa/enable", new { code });
        enableResponse.EnsureSuccessStatusCode();
        var enabled = await enableResponse.Content.ReadFromJsonAsync<EnableDto>();
        Assert.Equal(10, enabled!.RecoveryCodes.Count);

        await userClient.PostAsync("/api/auth/logout", null);

        var loginNoCode = await userClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password, rememberMe = false });
        var loginNoCodeBody = await loginNoCode.Content.ReadFromJsonAsync<LoginDto>();
        Assert.True(loginNoCodeBody!.TwoFactorRequired);
        Assert.Null(loginNoCodeBody.Profile);

        var meAfterPartialLogin = await userClient.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, meAfterPartialLogin.StatusCode);

        var loginWrongCode = await userClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password, rememberMe = false, twoFactorCode = "000000" });
        Assert.Equal(HttpStatusCode.Unauthorized, loginWrongCode.StatusCode);

        var freshCode = Totp.GenerateCode(setup.SharedKey);
        var loginWithCode = await userClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password, rememberMe = false, twoFactorCode = freshCode });
        loginWithCode.EnsureSuccessStatusCode();
        var loginWithCodeBody = await loginWithCode.Content.ReadFromJsonAsync<LoginDto>();
        Assert.False(loginWithCodeBody!.TwoFactorRequired);
        Assert.NotNull(loginWithCodeBody.Profile);

        var meAfterFullLogin = await userClient.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, meAfterFullLogin.StatusCode);

        await userClient.PostAsync("/api/auth/logout", null);
        var recoveryCode = enabled.RecoveryCodes[0];
        var loginWithRecovery = await userClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password, rememberMe = false, twoFactorCode = recoveryCode });
        loginWithRecovery.EnsureSuccessStatusCode();
        var loginWithRecoveryBody = await loginWithRecovery.Content.ReadFromJsonAsync<LoginDto>();
        Assert.False(loginWithRecoveryBody!.TwoFactorRequired);

        var disableResponse = await userClient.PostAsync("/api/auth/2fa/disable", null);
        Assert.Equal(HttpStatusCode.NoContent, disableResponse.StatusCode);

        await userClient.PostAsync("/api/auth/logout", null);
        var loginAfterDisable = await userClient.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password, rememberMe = false });
        var loginAfterDisableBody = await loginAfterDisable.Content.ReadFromJsonAsync<LoginDto>();
        Assert.False(loginAfterDisableBody!.TwoFactorRequired);
        Assert.NotNull(loginAfterDisableBody.Profile);
    }

    private sealed record LoginDto(bool TwoFactorRequired, ProfileDto? Profile);

    private sealed record ProfileDto(Guid Id);

    private sealed record SetupDto(string SharedKey, string AuthenticatorUri);

    private sealed record EnableDto(List<string> RecoveryCodes);
}
