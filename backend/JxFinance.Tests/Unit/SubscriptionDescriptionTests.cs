using JxFinance.Common.Subscriptions;

namespace JxFinance.Tests.Unit;

public sealed class SubscriptionDescriptionTests
{
    [Theory]
    [InlineData("NETFLIX.COM", "netflix com")]
    [InlineData("netflix.com", "netflix com")]
    [InlineData("  Spotify   AB    ", "spotify ab")]
    [InlineData("SPOTIFY AB REF 998877123", "spotify ab ref")]
    [InlineData("Telia 2026-09-21", "telia")]
    [InlineData("Telia 21.09.2026 sąskaita", "telia sąskaita")]
    [InlineData("MOKĖJIMAS UŽ IGNITIS, dok. nr. 4711", "mokėjimas už ignitis dok nr")]
    [InlineData("PIRKINYS *1234 LIDL ZIRMUNU", "pirkinys lidl zirmunu")]
    [InlineData("SPOTIFY P2ACB3F9D3", "spotify")]
    [InlineData("O2 Telia 5G", "o2 telia 5g")]
    [InlineData("", "")]
    [InlineData(null, "")]
    [InlineData("2026-09-21", "")]
    public void Bank_noise_is_removed_and_the_rest_is_lowercased(string? raw, string expected) =>
        Assert.Equal(expected, SubscriptionDescription.Normalize(raw));

    [Theory]
    [InlineData("MAXIMA LT, UAB", "PIRKINYS *1234 VILNIUS", "maxima lt uab")]
    [InlineData(null, "PIRKINYS *1234 VILNIUS", "pirkinys vilnius")]
    [InlineData("   ", "Lidl 0042", "lidl")]
    [InlineData("2026-09-21", "Lidl 0042", "lidl")]
    [InlineData(null, null, "")]
    public void The_key_is_the_payee_while_anything_is_left_of_it_and_else_the_description(string? payee, string? description, string expected) =>
        Assert.Equal(expected, SubscriptionDescription.KeyOf(payee, description));

    [Theory]
    [InlineData("NETFLIX.COM  ref 000112233")]
    [InlineData("Telia 21.09.2026 sąskaita")]
    [InlineData("o2 Arena 3M tape")]
    [InlineData("")]
    public void Normalizing_a_normalized_description_changes_nothing(string raw)
    {
        var once = SubscriptionDescription.Normalize(raw);

        Assert.Equal(once, SubscriptionDescription.Normalize(once));
    }

    [Fact]
    public void A_very_long_description_is_cut_to_what_the_column_holds()
    {
        var normalized = SubscriptionDescription.Normalize(string.Join(' ', Enumerable.Repeat("abonementas", 40)));

        Assert.Equal(SubscriptionDescription.MaxLength, normalized.Length);
        Assert.False(normalized.EndsWith(' '));
    }
}
