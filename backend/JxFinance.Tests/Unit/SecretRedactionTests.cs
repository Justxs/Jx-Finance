using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using JxFinance.Common.Email;
using JxFinance.Domain.Email;

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
        Assert.True(
            offenders.Count == 0,
            "Records that print a secret in ToString:" + Environment.NewLine + string.Join(Environment.NewLine, offenders));
    }

    private static IEnumerable<PropertyInfo> SecretProperties(Type type) =>
        type.GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Where(p => p.PropertyType == typeof(string) && p.CanWrite)
            .Where(p => SecretName().IsMatch(p.Name) || SecretHolder().IsMatch(type.Name));

    private static string Marker(PropertyInfo property) => $"marker-{property.Name}-7f3a";

    [GeneratedRegex("Password|Token|Secret|SharedKey|AuthenticatorUri|TwoFactorCode")]
    private static partial Regex SecretName();

    [GeneratedRegex("SigningKey$")]
    private static partial Regex SecretHolder();
}
