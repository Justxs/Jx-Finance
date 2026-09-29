using System.Text.Json.Nodes;
using JxFinance.Common.Errors;
using JxFinance.Common.Receipts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;
using JxFinance.Infrastructure.Receipts;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Unit;

public sealed class ReceiptAnswerTests
{
    private static readonly ReceiptInput Input = new([1], "image/jpeg", 1, 1);

    [Fact]
    public void The_worked_example_is_read_as_printed()
    {
        var extraction = Parse(FakeReceiptReader.Fixture(FakeReceiptReader.Maxima)).Value!;
        var result = extraction.Result;

        Assert.Equal(("MAXIMA LT, UAB", new DateOnly(2026, 9, 26), Currency.Eur, 18.21m, false), (result.Merchant, result.Date, result.Currency, result.Total, result.IsReturn));
        Assert.Equal([1.89m, 2.38m, 4.29m, 1.84m, 0.79m, 3.49m, 5.99m], result.Items.Select(i => i.Amount));
        Assert.Equal(0.86m, result.Items[2].Discount);
        Assert.Equal(0.10m, result.Items[4].Deposit);
        Assert.Equal("2 x 1,19", result.Items[1].Quantity);
        Assert.Equal(new ReceiptAdjustment(ReceiptAdjustmentKind.Discount, "Ačiū kortelės nuolaida", -0.50m), Assert.Single(result.Adjustments));
        Assert.Equal([1, 1, 1, 1, 1, 2, 2], extraction.ItemCategories);
        Assert.Equal((1200, 340), (extraction.InputTokens, extraction.OutputTokens));
    }

    [Theory]
    [InlineData("amount", "1.899")]
    [InlineData("amount", "-1.89")]
    [InlineData("discount", "-0.10")]
    [InlineData("amount", "100000000000000000")]
    public void An_item_amount_outside_the_money_rules_makes_the_answer_unreadable(string field, string value)
    {
        var answer = Answer();
        answer["items"]![0]![field] = JsonNode.Parse(value);

        Assert.Equal(ErrorCodes.ReceiptUnreadable, Parse(answer.ToJsonString()).ErrorCode);
    }

    [Fact]
    public void More_than_two_hundred_items_make_the_answer_unreadable()
    {
        var answer = Answer();
        var items = answer["items"]!.AsArray();
        while (items.Count <= ReceiptResult.MaxItems)
        {
            items.Add(items[0]!.DeepClone());
        }

        Assert.Equal(ErrorCodes.ReceiptUnreadable, Parse(answer.ToJsonString()).ErrorCode);
    }

    [Fact]
    public void Text_that_is_not_json_is_unreadable() =>
        Assert.Equal(ErrorCodes.ReceiptUnreadable, Parse("I cannot see a receipt.").ErrorCode);

    [Fact]
    public void An_unknown_currency_and_an_unparsable_date_are_read_as_missing()
    {
        var answer = Answer();
        answer["currency"] = "ZZZ";
        answer["date"] = "26.09.2026";

        var result = Parse(answer.ToJsonString()).Value!.Result;

        Assert.Equal((null, null), (result.Currency, result.Date));
    }

    [Fact]
    public void A_category_number_outside_the_list_is_read_as_no_category()
    {
        var answer = Answer();
        answer["items"]![0]!["category"] = 9;

        Assert.Null(Parse(answer.ToJsonString(), categoryCount: 2).Value!.ItemCategories[0]);
    }

    [Fact]
    public void Long_text_is_cut_to_what_the_column_holds()
    {
        var answer = Answer();
        answer["items"]![0]!["name"] = new string('a', 300);

        Assert.Equal(ReceiptResult.TextMaxLength, Parse(answer.ToJsonString()).Value!.Result.Items[0].Name.Length);
    }

    private static JsonNode Answer() => JsonNode.Parse(FakeReceiptReader.Fixture(FakeReceiptReader.Maxima))!;

    private static Result<ReceiptExtraction> Parse(string json, int categoryCount = 2) =>
        ReceiptAnswer.Parse(json, Input, categoryCount, 1200, 340);
}
