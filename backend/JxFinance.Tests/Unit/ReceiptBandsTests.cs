using ImageMagick;
using ImageMagick.Drawing;
using JxFinance.Infrastructure.Receipts;

namespace JxFinance.Tests.Unit;

public sealed class ReceiptBandsTests
{
    [Theory]
    [InlineData(1600)]
    [InlineData(ReceiptBands.SplitAbove)]
    public void An_image_up_to_four_thousand_pixels_tall_stays_one_part(int height)
    {
        using var image = new MagickImage(MagickColors.White, 100, (uint)height);

        using var part = new MagickImage(Assert.Single(ReceiptBands.Cut(image)));

        Assert.Equal((uint)height, part.Height);
    }

    [Theory]
    [InlineData(4001, new[] { 2000, 2000, 301 })]
    [InlineData(5700, new[] { 2000, 2000, 2000 })]
    [InlineData(5701, new[] { 2000, 2000, 2000, 151 })]
    public void A_taller_image_is_cut_into_overlapping_parts_and_none_is_only_overlap(int height, int[] heights)
    {
        using var image = new MagickImage(MagickColors.White, 100, (uint)height);

        var parts = ReceiptBands.Cut(image).Select(bytes => new MagickImage(bytes)).ToList();

        Assert.Equal(heights, parts.Select(part => (int)part.Height));
        Assert.All(parts, part => Assert.Equal(100u, part.Width));
        parts.ForEach(part => part.Dispose());
    }

    [Fact]
    public void Each_part_starts_where_the_previous_one_ends_less_the_overlap()
    {
        using var image = new MagickImage(MagickColors.White, 100, 4500);
        image.Draw(new Drawables().FillColor(MagickColors.Black).Rectangle(0, 1900, 99, 1949));

        var parts = ReceiptBands.Cut(image).Select(bytes => new MagickImage(bytes)).ToList();

        Assert.True(IsBlack(parts[0], 1925));
        Assert.True(IsBlack(parts[1], 75));
        Assert.False(IsBlack(parts[1], 150));
        Assert.False(IsBlack(parts[2], 75));
        parts.ForEach(part => part.Dispose());
    }

    [Fact]
    public void Lines_both_parts_read_are_kept_once()
    {
        var joined = ReceiptBands.Join(
        [
            "MAXIMA\nDuona 800 g  1,89 A\nPienas 1 l   1,19 A",
            "Duona 800 g 1,89 A\nPIENAS 1 L 1,19 A\nKefyras 0,99 A\n\n  Mokėti   4,07",
        ]);

        Assert.Equal("MAXIMA\nDuona 800 g 1,89 A\nPienas 1 l 1,19 A\nKefyras 0,99 A\nMokėti 4,07", joined);
    }

    [Fact]
    public void Parts_without_a_shared_line_follow_each_other_unchanged()
    {
        var joined = ReceiptBands.Join(["Duona 1,89 A\nPienas 1,19 A", "Kefyras 0,99 A\nMokėti 4,07"]);

        Assert.Equal("Duona 1,89 A\nPienas 1,19 A\nKefyras 0,99 A\nMokėti 4,07", joined);
    }

    [Fact]
    public void Lines_the_edge_cut_are_replaced_by_the_whole_lines_of_the_next_part()
    {
        var joined = ReceiptBands.Join(
        [
            "Duona 1,89 A\nPienas 1,19 A\nKefyras 0,99 A\nSviest",
            "na 1,89 A\nPienas 1,19 A\nKefyras 0,99 A\nSviestas 2,49 A",
        ]);

        Assert.Equal("Duona 1,89 A\nPienas 1,19 A\nKefyras 0,99 A\nSviestas 2,49 A", joined);
    }

    [Fact]
    public void Lines_shorter_than_four_characters_never_make_a_seam()
    {
        Assert.Equal("Duona\n1,8\n1,8\nPienas", ReceiptBands.Join(["Duona\n1,8", "1,8\nPienas"]));
        Assert.Equal("Duona\n1,89\nPienas", ReceiptBands.Join(["Duona\n1,89", "1,89\nPienas"]));
    }

    [Fact]
    public void Only_the_first_six_lines_of_the_next_part_are_compared()
    {
        var joined = ReceiptBands.Join(["Duona 1,89 A", "a1\na2\na3\na4\na5\na6\nDuona 1,89 A"]);

        Assert.Equal("Duona 1,89 A\na1\na2\na3\na4\na5\na6\nDuona 1,89 A", joined);
    }

    private static bool IsBlack(MagickImage image, int y) =>
        image.GetPixels().GetPixel(50, y).ToColor()!.R < 128;
}
