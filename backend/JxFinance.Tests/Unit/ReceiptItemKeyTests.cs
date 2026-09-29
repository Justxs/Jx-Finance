using JxFinance.Domain.Receipts;

namespace JxFinance.Tests.Unit;

public sealed class ReceiptItemKeyTests
{
    [Theory]
    [InlineData("PIENAS 2,5% 1L", "pienas")]
    [InlineData("Pienas 2.5 % 1 l", "pienas")]
    [InlineData("Sūris \"Džiugas\" 180 g", "sūris džiugas")]
    [InlineData("Head&Shoulders šampūnas 250 ml", "head shoulders šampūnas")]
    [InlineData("  Bananai   1,236 kg x 1,49 ", "bananai")]
    [InlineData("ČESNAKAI", "česnakai")]
    [InlineData("123 456", "")]
    public void Case_digits_units_and_punctuation_go_and_diacritics_stay(string name, string expected) =>
        Assert.Equal(expected, ReceiptItemKey.Normalize(name));

    [Fact]
    public void A_very_long_name_is_cut_to_what_the_column_holds()
    {
        var key = ReceiptItemKey.Normalize(string.Join(' ', Enumerable.Repeat("pomidorai", 40)));

        Assert.True(key.Length <= ReceiptResult.TextMaxLength);
        Assert.False(key.EndsWith(' '));
    }
}
