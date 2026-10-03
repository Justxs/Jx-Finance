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
    public void A_maxima_e_receipt_printed_from_the_mail_keeps_wrapped_names_and_the_discounts_printed_under_them()
    {
        var result = Parse(FakeReceiptReader.MaximaEmail);

        Assert.Equal(
            ("MAXIMA LT, UAB", "Raudondvario pl. 284a, Kaunas", new DateOnly(2026, 9, 22), Currency.Eur, 13.36m),
            (result.Merchant, result.Address, result.Date, result.Currency, result.Total));
        Assert.Equal(
            [
                ("Kepintos saulėgrąžos YES, grietinėlės ir svogūnų skoni", 1.59m, 0.34m, 0m),
                ("Gazuotas gėrimas FANTA LEMON ZERO", 2.49m, 0.75m, 0.10m),
                ("Gazuotas gėrimas FANTA", 2.49m, 0.75m, 0.10m),
                ("Tilžės sūris FARM MILK, 45 % rieb. s. m", 1.84m, 0m, 0m),
                ("Konservuoti smulkinti lupti pomidorai WELL DONE", 1.19m, 0m, 0m),
                ("Raudonos saldžiosios paprikos SALDVA", 0.59m, 0m, 0m),
                ("Kakavinės kriauklelės MIO & RIO", 1.44m, 0m, 0m),
                ("Lazanijos lakštai LA MOLISANA", 2.29m, 0m, 0m),
                ("UAT pienas WELL DONE be laktozės, 3,2 % rieb", 1.09m, 0m, 0m),
            ],
            result.Items.Select(i => (i.Name, i.Amount, i.Discount, i.Deposit)));
        Assert.Equal("0,72 X 2 vnt", result.Items[6].Quantity);
        Assert.Equal(new ReceiptAdjustment(ReceiptAdjustmentKind.Other, "Atsiskaityta MAXIMOS pinigais", -0.01m), Assert.Single(result.Adjustments));
        Assert.Empty(result.UnreadLines);
        Assert.Equal(result.Total, Balance(result));
    }

    [Fact]
    public void A_maxima_paper_receipt_joins_a_name_wrapped_onto_a_capitalised_line_and_takes_the_markdown_as_a_discount()
    {
        var result = Parse(FakeReceiptReader.MaximaPaper);

        Assert.Equal(
            ("MAXIMA LT, UAB", "Raudondvario pl. 284a, Kaunas", new DateOnly(2026, 7, 9), 17.03m),
            (result.Merchant, result.Address, result.Date, result.Total));
        Assert.Equal(
            [
                ("Jogurtas GRAIKIŠKA AMFORA su braškėmis, 2,4 % rieb", null, 2.29m, 0m),
                ("Baltyminis batonėlis MAXI NUTRITION su braškių, jogurt", "2,29 X 2 vnt", 4.58m, 0m),
                ("Šaldyti vištienos krūt. kepsneliai DONUTS MR TORES s", null, 3.69m, 0m),
                ("Stalčiaus organizatorius, 3 vnt", "5,99 X 2 vnt", 11.98m, 5.48m),
            ],
            result.Items.Select(i => (i.Name, i.Quantity, i.Amount, i.Discount)));
        Assert.Equal(-0.03m, Assert.Single(result.Adjustments).Amount);
        Assert.Empty(result.UnreadLines);
        Assert.Equal(result.Total, Balance(result));
    }

    [Fact]
    public void A_lidl_e_receipt_drops_article_codes_and_keeps_each_deposit_with_its_drink()
    {
        var result = Parse(FakeReceiptReader.LidlDeposits);

        Assert.Equal(
            ("UAB \"Lidl Lietuva\"", "Ežero g. 3, Kaunas", new DateOnly(2026, 9, 28), 14.47m),
            (result.Merchant, result.Address, result.Date, result.Total));
        Assert.Equal(
            [
                "Energ.gėrim.LEWIS HAMILTON", "Rudieji plevagrybiai", "Konserv.lalieji žirneliai", "PEPSI zero Gaz.galvosis gėr",
                "Nulupt.smulkin. pom. su bazil", "Šaltinio vanduo KIDS", "Tilandsija", "UAT grietinėlė 18%", "PEPSI zero Gaz.galvosis gėr",
                "Svogūnai raudonieji",
            ],
            result.Items.Select(i => i.Name));
        Assert.Equal([0.10m, 0m, 0m, 0.10m, 0m, 0.10m, 0m, 0m, 0.10m, 0m], result.Items.Select(i => i.Deposit));
        Assert.Equal(("0,49 x 0,872 kg", 0.43m), (result.Items[^1].Quantity, result.Items[^1].Amount));
        Assert.Empty(result.UnreadLines);
        Assert.Equal(result.Total, Balance(result));
    }

    [Fact]
    public void An_iki_app_receipt_reads_the_row_under_each_name_with_its_discount_column()
    {
        var result = Parse(FakeReceiptReader.IkiApp);

        Assert.Equal(
            ("IKI - LAMPĖDIS RAUDONDVARIO PL. 169B", new DateOnly(2026, 8, 12), Currency.Eur, 7.01m),
            (result.Merchant, result.Date, result.Currency, result.Total));
        Assert.Equal(
            [
                ("OSHEE HYDROBOOST CITRINŲ SK NEGAZUOT/IZOT GĖR. SU ELEKTROL. BEI VIT. 0,555L", 3.38m, 0m),
                ("KINDER SHOKO-BONS SALDAINIAI", 3.69m, 1.85m),
                ("PIZZA DONUT MARGHERITA 84G", 0.60m, 0m),
                ("MILKA PIENINIS BATONĖLIS SU VANIL.SK./PIENINIU ĮDARU IR KAKAV.SAUSAINIŲ GAB", 0.99m, 0m),
                ("PILNA VIENKARTINĖ PLASTIKO PAKUOTĖ", 0.20m, 0m),
            ],
            result.Items.Select(i => (i.Name, i.Amount, i.Discount)));
        Assert.Equal("1.69 € 2.000", result.Items[0].Quantity);
        Assert.Empty(result.UnreadLines);
        Assert.Equal(result.Total, Balance(result));
    }

    [Fact]
    public void An_iki_app_receipt_with_many_discounts_balances_to_its_total()
    {
        var result = Parse(FakeReceiptReader.IkiAppDiscounts);

        Assert.Equal(8.08m, result.Total);
        Assert.Equal([0.20m, 0.34m, 0m, 1.24m, 0.48m, 2.99m], result.Items.Select(i => i.Discount));
        Assert.Equal(result.Total, Balance(result));
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

    [Fact]
    public void A_lithuanian_invoice_is_read_from_its_item_table_with_the_vat_as_an_adjustment()
    {
        var result = Parse(FakeReceiptReader.Invoice);

        Assert.True(result.IsInvoice);
        Assert.Equal(
            ("UAB „Šviesos tinklai“", new DateOnly(2026, 9, 30), new DateOnly(2026, 10, 15), "ŠT 2026-0931", Currency.Eur, 1597.20m),
            (result.Merchant, result.Date, result.DueDate, result.InvoiceNumber, result.Currency, result.Total));
        Assert.Equal(
            [("Interneto paslauga 1 Gbps", "mėn. 1 20,00", 20m), ("Maršrutizatorius", "vnt 1 1 000,00", 1000m), ("Įrengimo darbai", "val 2 150,00", 300m)],
            result.Items.Select(i => (i.Name, i.Quantity, i.Amount)));
        Assert.Equal(new ReceiptAdjustment(ReceiptAdjustmentKind.Vat, "PVM 21%", 277.20m), Assert.Single(result.Adjustments));
        Assert.Null(result.Address);
        Assert.Empty(result.UnreadLines);
        Assert.Equal(result.Total, Balance(result));
    }

    [Fact]
    public void An_english_invoice_is_read_with_its_number_and_due_date()
    {
        var result = Parse(FakeReceiptReader.InvoiceEnglish);

        Assert.Equal(
            ("Northwind Hosting Ltd", new DateOnly(2026, 9, 15), new DateOnly(2026, 9, 29), "INV-2026-0042", Currency.Eur, 308.55m),
            (result.Merchant, result.Date, result.DueDate, result.InvoiceNumber, result.Currency, result.Total));
        Assert.Equal([("Web hosting plan 12 months", 240m), ("Domain renewal", 15m)], result.Items.Select(i => (i.Name, i.Amount)));
        Assert.Equal(new ReceiptAdjustment(ReceiptAdjustmentKind.Vat, "VAT 21%", 53.55m), Assert.Single(result.Adjustments));
        Assert.Equal(result.Total, Balance(result));
    }

    [Fact]
    public void An_invoice_with_rows_that_include_vat_gets_no_vat_adjustment()
    {
        var result = ReceiptTextParser.Parse("""
            Sąskaita faktūra Nr. 15
            Pardavėjas: MB "Medžio darbai"
            Pavadinimas Kiekis Suma
            Lentynos gamyba 1 121,00 121,00
            PVM 21% 21,00
            Iš viso 121,00
            """).Value!;

        Assert.Equal(("MB \"Medžio darbai\"", "15", 121m), (result.Merchant, result.InvoiceNumber, result.Total));
        Assert.Empty(result.Adjustments);
        Assert.Equal(result.Total, Balance(result));
    }

    [Fact]
    public void A_total_without_vat_is_not_the_total_and_a_wrapped_row_keeps_its_name()
    {
        var result = ReceiptTextParser.Parse("""
            Invoice No. 9
            Customer: Jonas Jonaitis Supplier: Ona Onaitė
            Description Qty Amount
            Consulting services for the garden
            2 25.00 50.00
            Iš viso be PVM 50,00
            PVM 21% 10,50
            Iš viso su PVM 60,50
            """).Value!;

        Assert.Equal(("Ona Onaitė", 60.50m), (result.Merchant, result.Total));
        Assert.Equal(("Consulting services for the garden", "2 25.00", 50m), (Assert.Single(result.Items).Name, result.Items[0].Quantity, result.Items[0].Amount));
        Assert.Equal(10.50m, Assert.Single(result.Adjustments).Amount);
    }

    [Theory]
    [InlineData("1 299,99", 1299.99)]
    [InlineData("1.299,99", 1299.99)]
    [InlineData("1,299.99", 1299.99)]
    [InlineData("12 345 678,90", 12345678.90)]
    public void An_amount_with_thousands_separators_is_read_whole(string printed, decimal amount)
    {
        var result = ReceiptTextParser.Parse($"""
            SENUKAI
            2026 m. spalio 2 d.
            Šaldytuvas {printed} A
            Mokėti {printed}
            """).Value!;

        Assert.Equal((amount, amount, new DateOnly(2026, 10, 2)), (result.Total, Assert.Single(result.Items).Amount, result.Date));
        Assert.False(result.IsInvoice);
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
