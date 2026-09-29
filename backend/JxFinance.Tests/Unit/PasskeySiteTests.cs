using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.Identity;

namespace JxFinance.Tests.Unit;

public sealed class PasskeySiteTests
{
    [Theory]
    [InlineData("", true)]
    [InlineData("https://finance.internal", true)]
    [InlineData("https://localhost:8443", true)]
    [InlineData("http://finance.internal", false)]
    [InlineData("https://192.168.1.20", false)]
    [InlineData("https://[fd00::20]", false)]
    [InlineData("finance.internal", false)]
    public void Passkeys_need_https_and_a_domain_name(string siteUrl, bool available) =>
        Assert.Equal(available, PasskeySite.IsAvailable(siteUrl));

    [Fact]
    public async Task The_site_address_fixes_the_relying_party_and_the_only_accepted_origin()
    {
        var options = new IdentityPasskeyOptions();

        PasskeySite.Configure(options, "https://Finance.Internal/");

        Assert.Equal("finance.internal", options.ServerDomain);
        Assert.Equal("required", options.UserVerificationRequirement);
        Assert.Equal("required", options.ResidentKeyRequirement);
        Assert.Equal("none", options.AttestationConveyancePreference);
        Assert.Equal(TimeSpan.FromMinutes(2), options.AuthenticatorTimeout);
        Assert.True(await options.ValidateOrigin!(Origin("https://finance.internal", crossOrigin: false)));
        Assert.False(await options.ValidateOrigin(Origin("https://finance.internal", crossOrigin: true)));
        Assert.False(await options.ValidateOrigin(Origin("https://finance.internal:8443", crossOrigin: false)));
        Assert.False(await options.ValidateOrigin(Origin("http://finance.internal", crossOrigin: false)));
        Assert.False(await options.ValidateOrigin(Origin("https://evil.internal", crossOrigin: false)));
    }

    [Fact]
    public void Without_a_site_address_the_host_decides_the_relying_party()
    {
        var options = new IdentityPasskeyOptions();

        PasskeySite.Configure(options, "");

        Assert.Null(options.ServerDomain);
        Assert.Null(options.ValidateOrigin);
    }

    private static PasskeyOriginValidationContext Origin(string origin, bool crossOrigin) => new()
    {
        HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext(),
        Origin = origin,
        CrossOrigin = crossOrigin,
    };
}
