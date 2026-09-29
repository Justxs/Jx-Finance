using System.Globalization;
using JxFinance.Common.SettleUp;
using JxFinance.Domain.Households;

namespace JxFinance.Tests.Unit;

public sealed class ShareAllocatorTests
{
    [Theory]
    [InlineData("100.00", new[] { 1, 1, 1 }, new[] { "33.34", "33.33", "33.33" })]
    [InlineData("0.01", new[] { 1, 1, 1 }, new[] { "0.01", "0.00", "0.00" })]
    [InlineData("0.02", new[] { 1, 1, 1 }, new[] { "0.01", "0.01", "0.00" })]
    [InlineData("90.00", new[] { 1, 1, 1 }, new[] { "30.00", "30.00", "30.00" })]
    public void Equal_splits_hand_the_leftover_cents_to_the_first_listed(string total, int[] parts, string[] expected)
    {
        var shares = ShareAllocator.Allocate(Parse(total), SplitMethod.Equal, [.. parts.Select(_ => new SharePart(null, null))]);

        Assert.Equal(expected.Select(Parse), shares!);
    }

    [Theory]
    [InlineData("100.00", new[] { 2, 1, 1 }, new[] { "50.00", "25.00", "25.00" })]
    [InlineData("10.00", new[] { 2, 1 }, new[] { "6.67", "3.33" })]
    [InlineData("10.00", new[] { 1, 2 }, new[] { "3.33", "6.67" })]
    [InlineData("1.00", new[] { 1, 1, 1 }, new[] { "0.34", "0.33", "0.33" })]
    [InlineData("50.00", new[] { 2, 0, 1 }, new[] { "33.33", "0.00", "16.67" })]
    [InlineData("0.05", new[] { 100, 1 }, new[] { "0.05", "0.00" })]
    public void Weights_split_by_largest_remainder(string total, int[] weights, string[] expected)
    {
        var shares = ShareAllocator.Allocate(Parse(total), SplitMethod.Shares, [.. weights.Select(w => new SharePart(w, null))]);

        Assert.Equal(expected.Select(Parse), shares!);
    }

    [Fact]
    public void All_zero_weights_cannot_be_split()
    {
        Assert.Null(ShareAllocator.Allocate(10m, SplitMethod.Shares, [new SharePart(0, null), new SharePart(0, null)]));
    }

    [Theory]
    [InlineData(new[] { "60.00", "40.00" }, true)]
    [InlineData(new[] { "60.00", "39.99" }, false)]
    [InlineData(new[] { "60.00", "40.01" }, false)]
    [InlineData(new[] { "100.00", "0.00" }, true)]
    public void Exact_amounts_must_add_up_to_the_total(string[] amounts, bool accepted)
    {
        var shares = ShareAllocator.Allocate(100m, SplitMethod.Exact, [.. amounts.Select(a => new SharePart(null, Parse(a)))]);

        Assert.Equal(accepted, shares is not null);
    }

    [Fact]
    public void An_exact_split_without_an_amount_is_refused()
    {
        Assert.Null(ShareAllocator.Allocate(10m, SplitMethod.Exact, [new SharePart(null, 10m), new SharePart(null, null)]));
    }

    [Fact]
    public void Shares_always_add_up_to_the_amount_and_differ_by_at_most_a_cent_from_the_exact_part()
    {
        var random = new Random(20260929);
        for (var run = 0; run < 2000; run++)
        {
            var total = random.Next(1, 10_000_000) / 100m;
            var weights = Enumerable.Range(0, random.Next(1, 12)).Select(_ => random.Next(1, 101)).ToList();
            var method = random.Next(2) == 0 ? SplitMethod.Equal : SplitMethod.Shares;
            List<int> effective = method == SplitMethod.Equal ? [.. weights.Select(_ => 1)] : weights;

            var shares = ShareAllocator.Allocate(total, method, [.. weights.Select(w => new SharePart(w, null))])!;

            Assert.Equal(total, shares.Sum());
            Assert.All(shares, share => Assert.Equal(share, decimal.Round(share, 2)));
            for (var index = 0; index < shares.Count; index++)
            {
                var exact = total * effective[index] / effective.Sum();
                Assert.True(Math.Abs(shares[index] - exact) < 0.01m, $"{total} split {string.Join(":", effective)}");
            }
        }
    }

    private static decimal Parse(string value) => decimal.Parse(value, CultureInfo.InvariantCulture);
}
