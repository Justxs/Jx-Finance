using JxFinance.Common.Discord;
using JxFinance.Extensions;

namespace JxFinance.Tests.Unit;

public sealed class DiscordWebhookUrlTests
{
    [Theory]
    [InlineData("https://discord.com/api/webhooks/123456789012345678/abc-DEF_123")]
    [InlineData("https://discordapp.com/api/webhooks/1/token")]
    [InlineData("https://ptb.discord.com/api/webhooks/1/token")]
    [InlineData("https://canary.discord.com/api/webhooks/1/token")]
    [InlineData("  https://DISCORD.com/api/webhooks/1/token  ")]
    public void Accepts_webhooks_on_the_discord_hosts(string url)
    {
        Assert.True(DiscordWebhookUrl.TryParse(url, out var target));
        Assert.NotEmpty(target.Id);
        Assert.NotEmpty(target.Token);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("http://discord.com/api/webhooks/1/token")]
    [InlineData("https://user:pass@discord.com/api/webhooks/1/token")]
    [InlineData("https://discord.com@evil.example/api/webhooks/1/token")]
    [InlineData("https://evil.example/api/webhooks/1/token")]
    [InlineData("https://discord.com.evil.example/api/webhooks/1/token")]
    [InlineData("https://evildiscord.com/api/webhooks/1/token")]
    [InlineData("https://162.159.128.233/api/webhooks/1/token")]
    [InlineData("https://[::1]/api/webhooks/1/token")]
    [InlineData("https://discord.com:8443/api/webhooks/1/token")]
    [InlineData("https://discord.com/api/webhooks/1/token/extra")]
    [InlineData("https://discord.com/api/webhooks/1/token/../../../internal")]
    [InlineData("https://discord.com/api/webhooks/abc/token")]
    [InlineData("https://discord.com/api/v10/webhooks/1/token")]
    [InlineData("https://discord.com/api/webhooks/1/token?wait=true")]
    [InlineData("https://discord.com/api/webhooks/1/token#fragment")]
    [InlineData("https://discord.com/api/webhooks/1/to%2Fken")]
    [InlineData("discord.com/api/webhooks/1/token")]
    public void Refuses_everything_else(string? url)
    {
        Assert.False(DiscordWebhookUrl.TryParse(url, out _));
    }

    [Fact]
    public void The_target_never_prints_its_token()
    {
        Assert.True(DiscordWebhookUrl.TryParse("https://discord.com/api/webhooks/42/very-secret-token", out var target));

        var printed = target.ToString();

        Assert.DoesNotContain("very-secret-token", printed, StringComparison.Ordinal);
        Assert.Contains("42", printed, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("https://discord.com/api/webhooks/42/very-secret-token")]
    [InlineData("https://canary.discord.com/api/webhooks/42/very-secret-token")]
    public void Traces_show_the_host_but_not_the_webhook_path(string url)
    {
        var redacted = TelemetryExtensions.RedactedDiscordUrl(new Uri(url));

        Assert.NotNull(redacted);
        Assert.DoesNotContain("very-secret-token", redacted, StringComparison.Ordinal);
        Assert.DoesNotContain("42", redacted, StringComparison.Ordinal);
    }

    [Fact]
    public void Traces_of_other_hosts_are_left_alone()
    {
        Assert.Null(TelemetryExtensions.RedactedDiscordUrl(new Uri("https://api.frankfurter.dev/v1/latest")));
    }
}
