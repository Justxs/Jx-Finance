using System.Net;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class TransactionExportTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Csv_export_is_streamed_and_holds_every_row_in_the_requested_order()
    {
        var account = await CreateAccountAsync();
        for (var day = 1; day <= 12; day++)
        {
            await RecordAsync(account, $"2026-05-{day:00}", $"{day}.00", $"Row {day}");
        }

        using var response = await Client.GetAsync(
            $"/api/transactions/export?accountId={account}&sort=date&direction=asc",
            HttpCompletionOption.ResponseHeadersRead);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("attachment", response.Content.Headers.ContentDisposition?.DispositionType);
        Assert.Equal("transactions.csv", response.Content.Headers.ContentDisposition?.FileName);
        Assert.Null(response.Content.Headers.ContentLength);
        var lines = (await response.Content.ReadAsStringAsync())
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        Assert.Equal("Date,Description,Account,Category,Tags,Type,Amount,Currency", lines[0]);
        Assert.Equal(13, lines.Length);
        Assert.StartsWith("2026-05-01,Row 1,", lines[1]);
        Assert.EndsWith(",Expense,1.00,EUR", lines[1]);
        Assert.StartsWith("2026-05-12,Row 12,", lines[12]);
        Assert.EndsWith(",Expense,12.00,EUR", lines[12]);
    }

    [Fact]
    public async Task Csv_export_of_a_split_transaction_is_one_row()
    {
        var account = await CreateAccountAsync();
        var food = await CreateCategoryAsync();
        var clothes = await CreateCategoryAsync();
        await PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new
            {
                accountId = account,
                type = "expense",
                amount = "50.00",
                date = "2026-05-02",
                description = "Split row",
                lines = new object[] { new { categoryId = food, amount = "30.00" }, new { categoryId = clothes, amount = "20.00" } },
            });

        var csv = await Client.GetStringAsync($"/api/transactions/export?accountId={account}");

        var row = Assert.Single(csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Skip(1));
        Assert.StartsWith("2026-05-02,Split row,", row);
        Assert.EndsWith(",,Expense,50.00,EUR", row);
    }

    [Fact]
    public async Task Pdf_export_refuses_more_rows_than_the_documented_limit()
    {
        var account = await CreateAccountAsync();
        for (var day = 1; day <= ApiFixture.PdfExportMaxRows; day++)
        {
            await RecordAsync(account, $"2026-05-{day:00}", "1.00", "Pdf row");
        }

        var atTheLimit = await Client.GetAsync($"/api/transactions/export/pdf?accountId={account}");
        await RecordAsync(account, "2026-05-20", "1.00", "One too many");
        var overTheLimit = await Client.GetAsync($"/api/transactions/export/pdf?accountId={account}");
        var narrowed = await Client.GetAsync($"/api/transactions/export/pdf?accountId={account}&dateFrom=2026-05-20");

        Assert.Equal(HttpStatusCode.OK, atTheLimit.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, overTheLimit.StatusCode);
        Assert.Contains("export.tooManyRows", await overTheLimit.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.OK, narrowed.StatusCode);
        Assert.Equal("application/pdf", narrowed.Content.Headers.ContentType?.MediaType);
    }

    private Task RecordAsync(Guid accountId, string date, string amount, string description) =>
        PostAsync<IdDto>(Client, "/api/transactions", new { accountId, type = "expense", amount, date, description });
}
