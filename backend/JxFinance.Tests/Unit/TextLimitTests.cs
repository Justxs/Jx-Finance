using JxFinance.Common;
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

    [Theory]
    [InlineData("  short  ", 5, "short")]
    [InlineData("abcdef", 5, "abcde")]
    [InlineData("   ", 5, "")]
    public void Cut_trims_and_cuts_without_a_mark(string text, int maxLength, string expected) =>
        Assert.Equal(expected, TextLimit.Cut(text, maxLength));

    [Theory]
    [InlineData("Ann", "ann@example.com", "Ann")]
    [InlineData(" ", "ann@example.com", "ann@example.com")]
    [InlineData(null, null, "")]
    public void A_user_reads_as_display_name_or_email(string? displayName, string? email, string expected) =>
        Assert.Equal(expected, AppUser.DisplayNameOrEmail(displayName, email));
}
