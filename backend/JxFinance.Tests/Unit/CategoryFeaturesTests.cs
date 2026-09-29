using JxFinance.Common.LearnedCategories;
using JxFinance.Common.Subscriptions;
using JxFinance.Domain.Accounts;

namespace JxFinance.Tests.Unit;

public sealed class CategoryFeaturesTests
{
    private static readonly AccountId Account = new(Guid.Parse("7a3f8c1e-0000-4000-8000-000000000001"));

    [Fact]
    public void Words_of_the_normalized_key_become_tokens_without_reference_digits()
    {
        var tokens = CategoryFeatures.Of(SubscriptionDescription.Normalize("MAXIMA LT, X 4471 Vilnius 2026-09-12"), Account, 12m);

        Assert.Equal(
            ["maxima", "lt", "vilnius", "key:maxima lt x vilnius", $"account:{Account.Value}", "amount:3"],
            tokens);
    }

    [Fact]
    public void Single_letters_are_left_out_but_stay_in_the_whole_key()
    {
        var tokens = CategoryFeatures.Of("a b rimi", Account, 1m);

        Assert.DoesNotContain("a", tokens);
        Assert.Contains("rimi", tokens);
        Assert.Contains("key:a b rimi", tokens);
    }

    [Fact]
    public void A_repeated_word_counts_once()
    {
        var tokens = CategoryFeatures.Of("iki iki", Account, 1m);

        Assert.Single(tokens, token => token == "iki");
    }

    [Fact]
    public void An_empty_key_gives_only_the_account_and_the_amount()
    {
        Assert.Equal([$"account:{Account.Value}", "amount:0"], CategoryFeatures.Of(string.Empty, Account, 0.5m));
    }

    [Theory]
    [InlineData("-12.00", 0)]
    [InlineData("0.99", 0)]
    [InlineData("1.00", 0)]
    [InlineData("1.99", 0)]
    [InlineData("2.00", 1)]
    [InlineData("3.99", 1)]
    [InlineData("4.00", 2)]
    [InlineData("1023.99", 9)]
    [InlineData("1024.00", 10)]
    [InlineData("1048576.00", 20)]
    [InlineData("99999999.00", 20)]
    public void Amounts_fall_into_powers_of_two_capped_at_twenty(string amount, int bucket)
    {
        Assert.Equal(bucket, CategoryFeatures.AmountBucket(decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture)));
    }

    [Theory]
    [InlineData("maxima", true)]
    [InlineData("key:maxima", false)]
    [InlineData("account:1", false)]
    [InlineData("amount:3", false)]
    public void Only_plain_words_count_as_words(string token, bool isWord)
    {
        Assert.Equal(isWord, CategoryFeatures.IsWord(token));
    }
}
