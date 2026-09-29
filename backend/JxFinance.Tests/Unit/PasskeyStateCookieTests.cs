using JxFinance.Infrastructure.Auth;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace JxFinance.Tests.Unit;

public sealed class PasskeyStateCookieTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 29, 8, 0, 0, TimeSpan.Zero);

    private readonly EphemeralDataProtectionProvider protection = new();
    private readonly TestClock clock = new(Now);

    [Fact]
    public void A_state_round_trips_for_its_own_kind()
    {
        var cookie = Cookie();
        var state = new PasskeyState(PasskeyCeremony.Registration, "{\"challenge\":\"abc\"}", Guid.NewGuid(), Guid.NewGuid(), Now.AddMinutes(5));

        Assert.Equal(state, cookie.Unprotect(cookie.Protect(state), PasskeyCeremony.Registration));
        Assert.Null(cookie.Unprotect(cookie.Protect(state), PasskeyCeremony.SignIn));
    }

    [Fact]
    public void A_tampered_value_is_refused()
    {
        var cookie = Cookie();
        var value = cookie.Protect(new PasskeyState(PasskeyCeremony.SignIn, "{}", null, null, Now.AddMinutes(5)));

        Assert.Null(cookie.Unprotect(value[..^2] + (value[^2] == 'A' ? "BA" : "AA"), PasskeyCeremony.SignIn));
        Assert.Null(cookie.Unprotect("not a protected value", PasskeyCeremony.SignIn));
    }

    [Fact]
    public void A_value_protected_for_another_purpose_is_refused()
    {
        var other = protection.CreateProtector("JxFinance.Something.Else")
            .Protect("{\"Kind\":1,\"State\":\"{}\",\"UserId\":null,\"SessionId\":null,\"ExpiresAt\":\"2026-09-29T08:05:00+00:00\"}");

        Assert.Null(Cookie().Unprotect(other, PasskeyCeremony.SignIn));
    }

    [Fact]
    public void An_expired_state_is_refused()
    {
        var cookie = Cookie();
        var value = cookie.Protect(new PasskeyState(PasskeyCeremony.SignIn, "{}", null, null, Now.Add(PasskeyStateCookie.Lifetime)));

        clock.UtcNow = Now.Add(PasskeyStateCookie.Lifetime);

        Assert.Null(cookie.Unprotect(value, PasskeyCeremony.SignIn));
    }

    [Fact]
    public void The_state_never_prints()
    {
        var printed = new PasskeyState(PasskeyCeremony.SignIn, "secret-challenge", null, null, Now).ToString();

        Assert.DoesNotContain("secret-challenge", printed, StringComparison.Ordinal);
        Assert.Contains("SignIn", printed, StringComparison.Ordinal);
    }

    private PasskeyStateCookie Cookie() => new(
        protection,
        new HttpContextAccessor { HttpContext = new DefaultHttpContext() },
        new ConfigurationBuilder().Build(),
        clock);
}
