using System.Text.Json.Nodes;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;
using JxFinance.Endpoints.Transactions.Services;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Unit;

public sealed class ReceiptItemSearchTests
{
    private static readonly ReceiptResult Receipt = new(
        "Senukai",
        new DateOnly(2026, 9, 12),
        Currency.Eur,
        349m,
        false,
        1,
        1,
        [
            new ReceiptItem("Pirkinių maišelis", null, 0.10m, 0m, 0m),
            new ReceiptItem("DYSON V8 dulkių siurblys", null, 299m, 0m, 0m),
            new ReceiptItem("Dyson filtras", null, 49.90m, 0m, 0m),
        ],
        [],
        []);

    [Fact]
    public async Task The_ledger_search_finds_attached_files_by_the_item_names_of_the_callers_own_readings_in_sql()
    {
        var userId = Guid.NewGuid();
        await using var capture = new SqlCapture(userId);
        var files = ReceiptItemSearch.MatchingFiles(capture.Db, userId, " dyson_v8 ");

        await capture.Db.Transactions
            .Where(t => capture.Db.TransactionAttachments.Any(a => a.TransactionId == t.Id && files.Contains(a.Sha256)))
            .ToListAsync(TestContext.Current.CancellationToken);

        var statement = capture.OnlyStatement;
        Assert.Contains("FROM \"ReceiptReadings\" AS r", statement, StringComparison.Ordinal);
        Assert.Contains("jsonb_array_elements(r.\"Result\" -> 'items')", statement, StringComparison.Ordinal);
        Assert.Contains("item ->> 'name' ILIKE", statement, StringComparison.Ordinal);
        Assert.Contains("\"TransactionAttachments\"", statement, StringComparison.Ordinal);
        Assert.Contains(userId, capture.Values);
        Assert.Contains(@"%dyson\_v8%", capture.Values);
    }

    [Fact]
    public async Task A_stored_reading_keeps_its_item_names_under_the_keys_the_search_reads()
    {
        await using var capture = new SqlCapture();

        await capture.Db.ReceiptReadings
            .Where(r => r.Sha256 == "unused")
            .ExecuteUpdateAsync(setters => setters.SetProperty(r => r.Result, Receipt), TestContext.Current.CancellationToken);

        var json = JsonNode.Parse(Assert.Single(capture.Values.OfType<string>(), value => value.StartsWith('{')))!;
        Assert.Equal("DYSON V8 dulkių siurblys", json["items"]![1]!["name"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("siurblys", "DYSON V8 dulkių siurblys")]
    [InlineData("  dyson ", "DYSON V8 dulkių siurblys")]
    [InlineData("FILTRAS", "Dyson filtras")]
    [InlineData("vacuum", null)]
    public void The_first_item_whose_name_holds_the_search_is_the_match(string search, string? expected) =>
        Assert.Equal(expected, ReceiptItemSearch.MatchingItem(Receipt, search));

    [Fact]
    public void A_reading_without_a_result_matches_nothing() =>
        Assert.Null(ReceiptItemSearch.MatchingItem(null, "dyson"));
}
