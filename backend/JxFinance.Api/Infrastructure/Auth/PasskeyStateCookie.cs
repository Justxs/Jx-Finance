using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using JxFinance.Common;
using JxFinance.Domain.Common;
using Microsoft.AspNetCore.DataProtection;

namespace JxFinance.Infrastructure.Auth;

public enum PasskeyCeremony
{
    Registration,
    SignIn,
}

public sealed record PasskeyState(PasskeyCeremony Kind, string State, Guid? UserId, Guid? SessionId, DateTimeOffset ExpiresAt)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(
            CultureInfo.InvariantCulture,
            $"Kind = {Kind}, State = {SecretText.Hidden}, UserId = {UserId}, SessionId = {SessionId}, ExpiresAt = {ExpiresAt:O}");
        return true;
    }
}

public sealed class PasskeyStateCookie(
    IDataProtectionProvider protection,
    IHttpContextAccessor httpContextAccessor,
    IConfiguration configuration,
    IClock clock)
{
    public const string Purpose = "JxFinance.Passkeys.State.v1";
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(5);

    private readonly IDataProtector protector = protection.CreateProtector(Purpose);

    private HttpContext Http => httpContextAccessor.HttpContext
        ?? throw new InvalidOperationException("Passkey ceremonies run only during an HTTP request.");

    public void Write(PasskeyCeremony kind, string state, Guid? userId = null, Guid? sessionId = null)
    {
        var expiresAt = clock.UtcNow.Add(Lifetime);
        Http.Response.Cookies.Append(
            AuthCookies.PasskeyState,
            Protect(new PasskeyState(kind, state, userId, sessionId, expiresAt)),
            AuthCookies.Options(Http, configuration, AuthCookies.PasskeyStatePath, expiresAt));
    }

    public PasskeyState? Take(PasskeyCeremony kind)
    {
        var value = Http.Request.Cookies[AuthCookies.PasskeyState];
        Http.Response.Cookies.Delete(
            AuthCookies.PasskeyState,
            AuthCookies.Options(Http, configuration, AuthCookies.PasskeyStatePath, null));
        return value is null ? null : Unprotect(value, kind);
    }

    public string Protect(PasskeyState state) => protector.Protect(JsonSerializer.Serialize(state));

    public PasskeyState? Unprotect(string value, PasskeyCeremony kind)
    {
        try
        {
            var state = JsonSerializer.Deserialize<PasskeyState>(protector.Unprotect(value));
            return state is not null && state.Kind == kind && state.ExpiresAt > clock.UtcNow ? state : null;
        }
        catch (Exception exception) when (exception is CryptographicException or JsonException or FormatException)
        {
            return null;
        }
    }
}
