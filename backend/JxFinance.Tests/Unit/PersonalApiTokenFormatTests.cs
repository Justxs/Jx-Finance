using JxFinance.Infrastructure.Auth;

namespace JxFinance.Tests.Unit;

public sealed class PersonalApiTokenFormatTests
{
    [Fact]
    public void An_issued_token_parses_back_to_its_prefix_and_matches_its_hash()
    {
        var issued = PersonalApiTokenFormat.Issue();

        Assert.True(PersonalApiTokenFormat.TryParse($"Bearer {issued.Token}", out var prefix, out var secret));
        Assert.Equal(issued.Prefix, prefix);
        Assert.Equal(PersonalApiTokenFormat.PrefixLength, prefix.Length);
        Assert.Equal(PersonalApiTokenFormat.HashLength, issued.SecretHash.Length);
        Assert.True(SecretHash.Matches(issued.SecretHash, secret));
        Assert.False(SecretHash.Matches(PersonalApiTokenFormat.Issue().SecretHash, secret));
        Assert.DoesNotContain(issued.Token, issued.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void Two_issued_tokens_differ()
    {
        var first = PersonalApiTokenFormat.Issue();
        var second = PersonalApiTokenFormat.Issue();

        Assert.NotEqual(first.Token, second.Token);
        Assert.NotEqual(first.SecretHash, second.SecretHash);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Basic dXNlcjpwYXNz")]
    [InlineData("Bearer eyJhbGciOiJIUzI1NiJ9.e30.x")]
    [InlineData("Bearer jxq_ABCDEFGH_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("Bearer JXP_ABCDEFGH_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("Bearer jxp_ABCDEFGH")]
    [InlineData("Bearer jxp_ABCDEFGHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("Bearer jxp_ABCDEFG__AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("Bearer jxp_ABCDEFGH_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("Bearer jxp_ABCDEFGH_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA!")]
    [InlineData("Bearer jxp_ABCDEFGH_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB")]
    [InlineData("Bearer jxp_ABCDEFGH_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    public void A_malformed_value_does_not_parse(string? authorization)
    {
        Assert.False(PersonalApiTokenFormat.TryParse(authorization, out _, out _));
    }

    [Fact]
    public void A_well_formed_value_parses_whatever_the_case_of_the_scheme()
    {
        const string token = "jxp_ABCDEFGH_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

        Assert.True(PersonalApiTokenFormat.TryParse($"Bearer {token}", out var prefix, out _));
        Assert.True(PersonalApiTokenFormat.TryParse($"bearer {token}", out _, out _));
        Assert.Equal("ABCDEFGH", prefix);
    }

    [Theory]
    [InlineData("Bearer jxp_anything", true)]
    [InlineData("bearer jxp_", true)]
    [InlineData("Bearer eyJhbGciOiJIUzI1NiJ9", false)]
    [InlineData("jxp_ABCDEFGH", false)]
    [InlineData(null, false)]
    public void Only_a_bearer_value_with_the_marker_selects_the_token_scheme(string? authorization, bool expected)
    {
        Assert.Equal(expected, PersonalApiTokenFormat.IsBearerToken(authorization));
    }
}
