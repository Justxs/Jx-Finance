using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using JxFinance.Common;
using JxFinance.Common.Discord;
using JxFinance.Common.Email;
using JxFinance.Domain.Email;
using JxFinance.Endpoints.Auth.Passkeys;
using JxFinance.Endpoints.Auth.Tokens;
using JxFinance.Endpoints.Settings.UpdateDiscordSettings;
using JxFinance.Endpoints.Settings.UpdateMarketPriceSettings;
using JxFinance.Extensions;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Tests.Unit;

public sealed partial class SecretRedactionTests
{
    private static readonly Assembly ApiAssembly = typeof(Program).Assembly;

    [Fact]
    public void Smtp_delivery_never_prints_its_password()
    {
        var delivery = new SmtpDelivery(
            "smtp.example.com",
            587,
            SmtpEncryption.StartTls,
            "relay",
            "relay-secret",
            "finance@example.com",
            "Jx Finance");

        var printed = delivery.ToString();

        Assert.DoesNotContain("relay-secret", printed, StringComparison.Ordinal);
        Assert.Contains("smtp.example.com", printed, StringComparison.Ordinal);
        Assert.Contains("relay", printed, StringComparison.Ordinal);
    }

    [Fact]
    public void Records_holding_secrets_never_print_them()
    {
        var records = ApiAssembly.GetTypes()
            .Where(type => type is { IsClass: true, IsAbstract: false, ContainsGenericParameters: false }
                && type.GetMethod("<Clone>$") is not null)
            .ToList();

        var guarded = new List<string>();
        var offenders = new List<string>();
        foreach (var type in records)
        {
            var secrets = SecretProperties(type).ToList();
            if (secrets.Count == 0)
            {
                continue;
            }

            var instance = RuntimeHelpers.GetUninitializedObject(type);
            foreach (var property in type.GetProperties(BindingFlags.Instance | BindingFlags.Public)
                .Where(p => p.PropertyType == typeof(string) && p.CanWrite))
            {
                property.SetValue(instance, Marker(property));
            }

            var printed = instance.ToString()!;
            guarded.Add(type.Name);
            offenders.AddRange(secrets
                .Where(property => printed.Contains(Marker(property), StringComparison.Ordinal))
                .Select(property => $"{type.FullName}.{property.Name}"));
        }

        Assert.Contains(nameof(SmtpDelivery), guarded);
        Assert.Contains(nameof(UpdateDiscordSettingsRequest), guarded);
        Assert.Contains(nameof(DiscordTarget), guarded);
        Assert.Contains(nameof(AddPasskeyRequest), guarded);
        Assert.Contains(nameof(PasskeySignInRequest), guarded);
        Assert.Contains(nameof(PasskeyState), guarded);
        Assert.Contains(nameof(CreatePersonalApiTokenRequest), guarded);
        Assert.Contains(nameof(CreatedPersonalApiTokenResponse), guarded);
        Assert.Contains(nameof(IssuedToken), guarded);
        Assert.Contains(nameof(UpdateMarketPriceSettingsRequest), guarded);
        Assert.True(
            offenders.Count == 0,
            "Records that print a secret in ToString:" + Environment.NewLine + string.Join(Environment.NewLine, offenders));
    }

    [Fact]
    public void Traces_of_eodhd_requests_hide_the_api_key()
    {
        var redacted = TelemetryExtensions.RedactedEodhdUrl(
            new Uri("https://eodhd.com/api/eod/VWCE.XETRA?from=2026-09-25&to=2026-09-29&fmt=json&api_token=very-secret-key"));

        Assert.NotNull(redacted);
        Assert.DoesNotContain("very-secret-key", redacted, StringComparison.Ordinal);
        Assert.Contains("api/eod/VWCE.XETRA", redacted, StringComparison.Ordinal);
        Assert.Contains("api_token=" + SecretText.Hidden, redacted, StringComparison.Ordinal);
        Assert.Null(TelemetryExtensions.RedactedEodhdUrl(new Uri("https://api.kraken.com/0/public/OHLC?pair=XBTEUR")));
    }

    private static IEnumerable<PropertyInfo> SecretProperties(Type type) =>
        type.GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Where(p => p.PropertyType == typeof(string) && p.CanWrite)
            .Where(p => SecretName().IsMatch(p.Name) || SecretHolder().IsMatch(type.Name));

    private static string Marker(PropertyInfo property) => $"marker-{property.Name}-7f3a";

    [GeneratedRegex("Password|(?<!Via)Token|Secret|SharedKey|ApiKey|AuthenticatorUri|TwoFactorCode|Webhook|Credential")]
    private static partial Regex SecretName();

    [GeneratedRegex("SigningKey$|^PasskeyState$")]
    private static partial Regex SecretHolder();
}
