using JxFinance.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Tests.Unit;

public sealed class TextLimitTests
{
    [Theory]
    [InlineData("  short  ", 5, "short")]
    [InlineData("abcdef", 5, "abcd…")]
    [InlineData(" abcdef ", 6, "abcdef")]
    public void Ellipsize_trims_and_marks_a_cut(string text, int maxLength, string expected) =>
        Assert.Equal(expected, TextLimit.Ellipsize(text, maxLength));

    [Fact]
    public void Ellipsize_keeps_null() => Assert.Null(TextLimit.Ellipsize(null, 5));

    [Fact]
    public void A_cut_never_splits_an_emoji_in_half()
    {
        Assert.Equal("ab…", TextLimit.Ellipsize("ab😀cd", 4));
        Assert.Equal("ab", TextLimit.Cut("ab😀cd", 3));
        Assert.Equal("ab😀", TextLimit.Cut("ab😀cd", 4));
    }

    [Theory]
    [InlineData("  short  ", 5, "short")]
    [InlineData("abcdef", 5, "abcde")]
    [InlineData("   ", 5, "")]
    public void Cut_trims_and_cuts_without_a_mark(string text, int maxLength, string expected) =>
        Assert.Equal(expected, TextLimit.Cut(text, maxLength));

    [Theory]
    [InlineData(null, null)]
    [InlineData("   ", null)]
    [InlineData("  MAXIMA LT, UAB  ", "MAXIMA LT, UAB")]
    public void A_payee_is_trimmed_and_a_blank_one_is_none(string? payee, string? expected) =>
        Assert.Equal(expected, TransactionPayee.Clip(payee));

    [Fact]
    public void A_payee_is_clipped_to_two_hundred_characters_without_a_trailing_space()
    {
        Assert.Equal(new string('a', 200), TransactionPayee.Clip(new string('a', 201)));
        Assert.Equal(new string('a', 199), TransactionPayee.Clip(new string('a', 199) + "  bbb"));
    }

    [Theory]
    [InlineData("Ann", "ann@example.com", "Ann")]
    [InlineData(" ", "ann@example.com", "ann@example.com")]
    [InlineData(null, null, "")]
    public void A_user_reads_as_display_name_or_email(string? displayName, string? email, string expected) =>
        Assert.Equal(expected, AppUser.DisplayNameOrEmail(displayName, email));
}
