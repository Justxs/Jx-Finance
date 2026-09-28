using JxFinance.Common.CategorizationRules;
using JxFinance.Common.Subscriptions;
using JxFinance.Domain.CategorizationRules;

namespace JxFinance.Tests.Unit;

public sealed class RulePatternFinderTests
{
    [Theory]
    [InlineData("MAXIMA X123 VILNIUS", "Maxima X456 Kaunas", "MAXIMA")]
    [InlineData("Pirkinys MAXIMA 2026-09-01", "PIRKINYS MAXIMA 2026-08-11", "Pirkinys MAXIMA")]
    [InlineData("Spotify P1A2B3C4", "Spotify P9Z8Y7X6", "Spotify")]
    [InlineData("Netflix.com", "Netflix.com", "Netflix.com")]
    public void A_common_start_is_cut_back_to_a_word_end(string newest, string older, string expected)
    {
        var found = RulePatternFinder.For([newest, older], Key(newest));

        Assert.Equal((DescriptionMatch.StartsWith, expected), found);
    }

    [Fact]
    public void Card_lines_that_start_differently_fall_back_to_the_shared_word()
    {
        string[] descriptions = ["4402 MAXIMA X-12", "7719 maxima LT", "0012 Maxima"];

        var found = RulePatternFinder.For(descriptions, Key(descriptions[0]));

        Assert.Equal((DescriptionMatch.Contains, "MAXIMA"), found);
    }

    [Fact]
    public void A_common_start_shorter_than_three_characters_is_not_used()
    {
        string[] descriptions = ["AB Lidl", "AB Rimi Lidl"];

        var found = RulePatternFinder.For(descriptions, Key(descriptions[0]));

        Assert.Equal((DescriptionMatch.Contains, "Lidl"), found);
    }

    [Fact]
    public void Descriptions_without_a_shared_word_get_no_pattern()
    {
        Assert.Null(RulePatternFinder.For(["Rimi 12", "Iki 34"], "rimi"));
        Assert.Null(RulePatternFinder.For(["UAB Go", "AB Go"], "ab go"));
    }

    [Theory]
    [InlineData("MAXIMA X123 VILNIUS", "Maxima X456 Kaunas", "maxima LT 7")]
    [InlineData("4402 MAXIMA X-12", "7719 maxima LT", "0012 Maxima")]
    [InlineData("Kavine Vero 1", "Kavine Vero 22", "kavine vero")]
    public void The_pattern_matches_every_description_it_came_from(string first, string second, string third)
    {
        string[] descriptions = [first, second, third];

        var (match, pattern) = RulePatternFinder.For(descriptions, Key(first))!.Value;

        Assert.All(descriptions, description => Assert.True(RuleMatcher.Matches(match, pattern, description)));
    }

    private static string Key(string description) => SubscriptionDescription.Normalize(description);
}
