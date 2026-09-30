using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;
using JxFinance.Infrastructure.Receipts;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Unit;

public sealed class ReceiptTextParserTests
{
    [Fact]
    public void A_maxima_receipt_is_read_as_printed()
    {
        var result = Parse(FakeReceiptReader.Maxima);

        Assert.Equal(("MAXIMA LT, UAB", new DateOnly(2026, 9, 26), Currency.Eur, 18.21m, false), (result.Merchant, result.Date, result.Currency, result.Total, result.IsReturn));
        Assert.Equal(
            ["Duona BOČIŲ 800 g", "Pienas 2,5 % 1 l", "Sūris DŽIUGAS 180 g", "Bananai", "Mineralinis vanduo 1,5 l", "Colgate dantų pasta 75 ml", "Head&Shoulders šampūnas 250 ml"],
            result.Items.Select(i => i.Name));
        Assert.Equal([1.89m, 2.38m, 4.29m, 1.84m, 0.79m, 3.49m, 5.99m], result.Items.Select(i => i.Amount));
        Assert.Equal([0m, 0m, 0.86m, 0m, 0m, 0m, 1.20m], result.Items.Select(i => i.Discount));
        Assert.Equal([0m, 0m, 0m, 0m, 0.10m, 0m, 0m], result.Items.Select(i => i.Deposit));
        Assert.Equal([null, "2 x 1,19", null, "1,236 kg x 1,49 EUR/kg", null, null, null], result.Items.Select(i => i.Quantity));
        Assert.Equal(new ReceiptAdjustment(ReceiptAdjustmentKind.Discount, "AČIŪ kortelės nuolaida", -0.50m), Assert.Single(result.Adjustments));
        Assert.Empty(result.UnreadLines);
        Assert.Equal(result.Total, Balance(result));
    }

    [Fact]
    public void A_rimi_receipt_puts_the_weight_line_under_its_name_and_the_card_discount_on_its_item()
    {
        var result = Parse(FakeReceiptReader.Rimi);

        Assert.Equal(("UAB \"RIMI LIETUVA\"", new DateOnly(2026, 9, 20), Currency.Eur, 6.31m), (result.Merchant, result.Date, result.Currency, result.Total));
        Assert.Equal(["Obuoliai Gala", "Kefyras 2,5 % 500 g", "Makaronai 500 g", "Dantų šepetėlis"], result.Items.Select(i => i.Name));
        Assert.Equal("0,845 kg x 2,29 EUR/kg", result.Items[0].Quantity);
        Assert.Equal(0.20m, result.Items[1].Discount);
        Assert.Empty(result.Adjustments);
        Assert.Empty(result.UnreadLines);
        Assert.Equal(result.Total, Balance(result));
    }

    [Fact]
    public void An_iki_receipt_keeps_the_deposit_with_its_drink_and_the_bottle_voucher_on_the_whole_receipt()
    {
        var result = Parse(FakeReceiptReader.Iki);

        Assert.Equal(("UAB \"Palink\" IKI", new DateOnly(2026, 9, 22), 2.78m), (result.Merchant, result.Date, result.Total));
        Assert.Equal(["Alus 0,5 l", "Traškučiai 130 g"], result.Items.Select(i => i.Name));
        Assert.Equal(0.10m, result.Items[0].Deposit);
        Assert.Equal(new ReceiptAdjustment(ReceiptAdjustmentKind.Voucher, "Taromato kvitas", -0.60m), Assert.Single(result.Adjustments));
        Assert.Equal(result.Total, Balance(result));
    }

    [Fact]
    public void A_lidl_receipt_takes_the_quantity_printed_under_a_priced_item()
    {
        var result = Parse(FakeReceiptReader.Lidl);

        Assert.Equal(("Lidl Lietuva, UAB", new DateOnly(2026, 9, 24), Currency.Eur, 9.37m), (result.Merchant, result.Date, result.Currency, result.Total));
        Assert.Equal(
            ["Pomidorai", "Varškė 9 % 200 g", "Varškė 9 % 200 g", "Sviestas 82 % 180 g", "Vištienos filė"],
            result.Items.Select(i => i.Name));
        Assert.Equal(["0,482 kg x 1,49 EUR/kg", null, null, null, "2 x 1,99"], result.Items.Select(i => i.Quantity));
        Assert.Equal(0.50m, result.Items[3].Discount);
        Assert.Empty(result.UnreadLines);
        Assert.Equal(result.Total, Balance(result));
    }

    [Fact]
    public void A_noisy_photo_is_read_through_ocr_confusions_and_keeps_the_lines_it_cannot_read()
    {
        var result = Parse(FakeReceiptReader.MaximaNoisy);

        Assert.Equal(("MAXIMA LT, UAB", new DateOnly(2026, 9, 26), 20.40m), (result.Merchant, result.Date, result.Total));
        Assert.Equal(
            ["Duona BOCIU 800 g", "Pienas 2,5 % 1 1", "Suris DZIUGAS 180 g", "Bananai", "Mineralinis vanduo 1,5 1", "Colgate danty pasta 75 ml", "HeadsShoulders Sampunas 250 ml"],
            result.Items.Select(i => i.Name));
        Assert.Equal([1.89m, 2.38m, 4.29m, 1.84m, 0.79m, 3.49m, 5.99m], result.Items.Select(i => i.Amount));
        Assert.Equal((0.86m, 0.10m, 1.20m), (result.Items[2].Discount, result.Items[4].Deposit, result.Items[6].Discount));
        Assert.Equal(-0.50m, Assert.Single(result.Adjustments).Amount);
        Assert.Equal(["Kiausiniai M 10 vnt Z,19 A", "So. ~~ . 7"], result.UnreadLines);
        Assert.Equal(18.21m, Balance(result));
    }

    [Fact]
    public void A_return_receipt_is_marked_and_its_amounts_are_positive()
    {
        var result = Parse(FakeReceiptReader.Return);

        Assert.True(result.IsReturn);
        Assert.Equal(4.79m, result.Total);
        Assert.Equal(("Head&Shoulders šampūnas 250 ml", 4.79m), (Assert.Single(result.Items).Name, result.Items[0].Amount));
    }

    [Fact]
    public void A_simple_english_receipt_is_read()
    {
        var result = ReceiptTextParser.Parse("""
            CORNER SHOP
            12 High Street
            Milk 1l 1.20 A
            Bread 2.10 A
            Discount -0.20
            Subtotal 3.10
            TOTAL GBP 3.10
            CARD 3.10
            29/09/2026 12:00
            """).Value!;

        Assert.Equal(("CORNER SHOP", new DateOnly(2026, 9, 29), Currency.Gbp, 3.10m), (result.Merchant, result.Date, result.Currency, result.Total));
        Assert.Null(result.Address);
        Assert.Equal([("Milk 1l", 1.20m, 0m), ("Bread", 2.10m, 0.20m)], result.Items.Select(i => (i.Name, i.Amount, i.Discount)));
    }

    [Fact]
    public void A_weight_on_the_item_line_and_a_price_on_the_next_line_are_both_understood()
    {
        var result = ReceiptTextParser.Parse("""
            NORFA
            Bananai 1,236 kg x 1,49 1,84 A
            Arbata žalioji 20 vnt
            2,99 A
            Tarpinė suma 4,83
            Suma 4,83
            """).Value!;

        Assert.Equal([("Bananai", "1,236 kg x 1,49", 1.84m), ("Arbata žalioji 20 vnt", null, 2.99m)], result.Items.Select(i => (i.Name, i.Quantity, i.Amount)));
        Assert.Equal(4.83m, result.Total);
    }

    [Fact]
    public void A_line_without_a_price_between_items_is_kept_as_unread()
    {
        var result = ReceiptTextParser.Parse("""
            Duona 1,89 A
            Sūris su
            Pienas 1,19 A
            Mokėti 3,08
            """).Value!;

        Assert.Equal(["Duona", "Pienas"], result.Items.Select(i => i.Name));
        Assert.Equal(["Sūris su"], result.UnreadLines);
    }

    [Theory]
    [InlineData(FakeReceiptReader.Maxima, "Savanorių pr. 247, LT-02300 Vilnius")]
    [InlineData(FakeReceiptReader.MaximaNoisy, "a Savanoriu pr. 247, LT-02300 Vilnius")]
    [InlineData(FakeReceiptReader.Rimi, "Rimi Ozas, Ozo g. 18, Vilnius")]
    [InlineData(FakeReceiptReader.Iki, "Žirmūnų g. 64, Vilnius")]
    [InlineData(FakeReceiptReader.Lidl, "Ukmergės g. 369, Vilnius")]
    [InlineData(FakeReceiptReader.Return, "Savanorių pr. 247, LT-02300 Vilnius")]
    public void The_address_is_the_first_header_line_after_the_merchant_with_a_street_number_and_a_postcode_or_city(string fixture, string address) =>
        Assert.Equal(address, Parse(fixture).Address);

    [Fact]
    public void A_header_line_with_a_number_but_no_postcode_or_city_is_not_an_address()
    {
        var result = ReceiptTextParser.Parse("""
            MAXIMA LT, UAB
            Kasa 3 Kvitas 0457
            Duona 1,89 A
            MOKĖTI EUR 1,89
            """).Value!;

        Assert.Null(result.Address);
    }

    [Theory]
    [InlineData("")]
    [InlineData("A blurred photo of a cat\nwith no prices at all")]
    public void Text_without_items_or_a_total_is_unreadable(string text) =>
        Assert.Equal(ErrorCodes.ReceiptUnreadable, ReceiptTextParser.Parse(text).ErrorCode);

    private static ReceiptResult Parse(string fixture) => ReceiptTextParser.Parse(FakeReceiptReader.Fixture(fixture)).Value!;

    private static decimal Balance(ReceiptResult result) =>
        result.Items.Sum(i => i.Amount - i.Discount + i.Deposit) + result.Adjustments.Sum(a => a.Amount);
}
