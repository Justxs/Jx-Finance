using JxFinance.Common.Email;
using JxFinance.Infrastructure.Configuration;
using Microsoft.Extensions.Options;

namespace JxFinance.Tests.Unit;

public sealed class EmailLinksTests
{
    [Fact]
    public void Links_point_at_the_configured_site_address()
    {
        var links = new EmailLinks(Options.Create(new AppOptions { SiteUrl = " https://finance.internal/ " }));

        Assert.Equal("https://finance.internal/reset-password?email=a@b.lt&token=x%2By", links.PasswordReset("a@b.lt", "x+y"));
        Assert.Equal("https://finance.internal/verify-email?email=a@b.lt&token=t", links.EmailVerification("a@b.lt", "t"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    public void Without_a_site_address_no_link_is_built(string siteUrl)
    {
        var links = new EmailLinks(Options.Create(new AppOptions { SiteUrl = siteUrl }));

        Assert.Null(links.PasswordReset("a@b.lt", "token"));
        Assert.Null(links.EmailVerification("a@b.lt", "token"));
    }
}
