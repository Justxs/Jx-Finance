using System.Buffers;
using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;

namespace JxFinance.Common.Discord;

public static partial class DiscordWebhookUrl
{
    public const int MaxLength = 500;

    private static readonly SearchValues<char> Forbidden = SearchValues.Create("?#\\@ ");

    private static readonly string[] AllowedHosts =
    [
        "discord.com",
        "discordapp.com",
        "ptb.discord.com",
        "canary.discord.com",
    ];

    public static bool IsValid(string? text) => TryParse(text, out _);

    public static bool TryParse(string? text, [NotNullWhen(true)] out DiscordTarget? target)
    {
        target = null;
        var trimmed = text?.Trim();
        if (string.IsNullOrEmpty(trimmed)
            || trimmed.Length > MaxLength
            || trimmed.AsSpan().ContainsAny(Forbidden)
            || !Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
        {
            return false;
        }

        if (uri.Scheme != Uri.UriSchemeHttps
            || uri.HostNameType != UriHostNameType.Dns
            || !uri.IsDefaultPort
            || uri.UserInfo.Length > 0
            || !AllowedHosts.Contains(uri.IdnHost, StringComparer.OrdinalIgnoreCase))
        {
            return false;
        }

        var match = WebhookPath().Match(uri.AbsolutePath);
        if (!match.Success)
        {
            return false;
        }

        target = new DiscordTarget(match.Groups["id"].Value, match.Groups["token"].Value);
        return true;
    }

    [GeneratedRegex(@"\A/api/webhooks/(?<id>[0-9]{1,20})/(?<token>[A-Za-z0-9_-]{1,100})\z", RegexOptions.CultureInvariant)]
    private static partial Regex WebhookPath();
}
