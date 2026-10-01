using System.Globalization;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Imports;

[Collection<IntegrationCollection>]
public sealed class LearnedCategoryImportTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Header = "\"Sąskaitos Nr.\",\"\",\"Data\",\"Gavėjas\",\"Paaiškinimai\",\"Suma\",\"Valiuta\",\"D/K\",\"Įrašo Nr.\"\n";

    [Fact]
    public async Task A_row_no_rule_fills_gets_a_learned_guess_and_a_ruled_row_or_a_duplicate_gets_none()
    {
        await using var on = await LearnedCategoriesOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("500.00", client: member);
        var groceries = await CreateCategoryAsync(client: member);
        var ruled = await CreateCategoryAsync(client: member);
        await HistoryAsync(member, account, groceries, "MAXIMA LT 0412 VILNIUS", 4);
        await Seed.RuleAsync(member, "contains", "MAXIMA LT 0388", categoryId: ruled);
        var reference = Guid.NewGuid().ToString("N")[..10];
        var csv = Header
            + Line("MAXIMA LT 0518 VILNIUS", "12.40", $"{reference}-1")
            + Line("MAXIMA LT 0388 VILNIUS", "9.10", $"{reference}-2")
            + Line("MAXIMA LT 0518 VILNIUS", "12.40", $"{reference}-1");

        var rows = await PreviewAsync(member, account, csv);

        Assert.Equal(groceries, rows[0].LearnedCategoryId);
        Assert.InRange(rows[0].LearnedConfidence!.Value, 0.80m, 1m);
        Assert.Equal((ruled, (Guid?)null, (decimal?)null), (rows[1].SuggestedCategoryId, rows[1].LearnedCategoryId, rows[1].LearnedConfidence));
        Assert.True(rows[2].IsDuplicate);
        Assert.Null(rows[2].LearnedCategoryId);
    }

    [Fact]
    public async Task The_preview_carries_no_learned_guess_while_the_switch_is_off()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("500.00", client: member);
        var groceries = await CreateCategoryAsync(client: member);
        await HistoryAsync(member, account, groceries, "MAXIMA LT 0412 VILNIUS", 4);

        var rows = await PreviewAsync(member, account, Header + Line("MAXIMA LT 0518 VILNIUS", "12.40", Guid.NewGuid().ToString("N")[..10]));

        Assert.Null(Assert.Single(rows).LearnedCategoryId);
    }

    private async Task HistoryAsync(HttpClient client, Guid account, Guid category, string description, int count)
    {
        for (var day = 1; day <= count; day++)
        {
            await CreateTransactionAsync(client, account, category, "expense", "11.20", DateText(day * 7), description);
        }
    }

    private string Line(string description, string amount, string reference) =>
        $"\"LT476300010172306416\",\"20\",\"{DateText(1)}\",\"MAXIMA LT, UAB\",\"{description}\",\"{amount}\",\"EUR\",\"D\",\"LEARNED-{reference}\"\n";

    private string DateText(int daysAgo) => Today.AddDays(-daysAgo).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static async Task<List<PreviewRowDto>> PreviewAsync(HttpClient client, Guid account, string csv) =>
        (await ReadOkAsync<PreviewDto>(await UploadCsvAsync(client, account, csv))).Rows;

    private sealed record PreviewRowDto(
        string ImportRef,
        bool IsDuplicate,
        Guid? SuggestedCategoryId,
        string? MatchedRuleName,
        Guid? LearnedCategoryId,
        decimal? LearnedConfidence);

    private sealed record PreviewDto(List<PreviewRowDto> Rows);
}
