using JxFinance.Common.Telegram;
using JxFinance.Extensions;

namespace JxFinance.Tests.Unit;

public sealed class TelegramBotTokenTests
{
    [Theory]
    [InlineData("123456789:AAEhBP0av18z2kPqhh1EbM3Xyh9ZNeC9Q1k")]
    [InlineData("  7:abcdefghijklmnopqrstuvwxyz_-0123  ")]
    public void Accepts_tokens_from_botfather(string text)
    {
        Assert.True(TelegramBotToken.TryParse(text, out var token));
        Assert.Equal(text.Trim(), token);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("AAEhBP0av18z2kPqhh1EbM3Xyh9ZNeC9Q1k")]
    [InlineData("123456789:short")]
    [InlineData("123456789:AAEhBP0av18z2kPqhh1EbM3Xyh9ZNeC9Q1k/getUpdates")]
    [InlineData("123456789:AAEhBP0av18z2kPqhh1EbM3Xyh9ZNeC9Q1k?x=1")]
    [InlineData("123456789:AAEhBP0av18z2kPqhh1 EbM3Xyh9ZNeC9Q1k")]
    [InlineData("abc:AAEhBP0av18z2kPqhh1EbM3Xyh9ZNeC9Q1k")]
    [InlineData("https://api.telegram.org/bot123456789:AAEhBP0av18z2kPqhh1EbM3Xyh9ZNeC9Q1k")]
    public void Refuses_everything_else(string? text)
    {
        Assert.False(TelegramBotToken.TryParse(text, out _));
    }

    [Fact]
    public void The_target_never_prints_its_token()
    {
        var printed = new TelegramTarget("123:very-secret-token", -10042).ToString();

        Assert.DoesNotContain("very-secret-token", printed, StringComparison.Ordinal);
        Assert.Contains("-10042", printed, StringComparison.Ordinal);
    }

    [Fact]
    public void Traces_show_the_method_but_not_the_token()
    {
        var redacted = TelemetryExtensions.RedactedTelegramUrl(
            new Uri("https://api.telegram.org/bot123456789:very-secret-token/sendMessage"));

        Assert.Equal("https://api.telegram.org/bot***/sendMessage", redacted);
        Assert.Null(TelemetryExtensions.RedactedTelegramUrl(new Uri("https://api.frankfurter.dev/v1/latest")));
    }
}
