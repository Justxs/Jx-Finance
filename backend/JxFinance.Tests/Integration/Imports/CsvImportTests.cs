using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Imports;

[Collection<IntegrationCollection>]
public sealed class CsvImportTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_mapping_is_created_listed_updated_deleted_and_restored()
    {
        var name = $"Bank {Guid.NewGuid():N}"[..20];
        var created = await ReadOkAsync<MappingDto>(await Client.PostAsJsonAsync("/api/import/csv-mappings", SampleCsv.RevolutBody(name), TestContext.Current.CancellationToken));

        Assert.Equal((name, "Completed Date", "COMPLETED"), (created.Name, created.Columns.Date, created.Columns.BookedValues));
        Assert.Contains(await ListAsync(Client), m => m.Id == created.Id);

        var updated = await ReadOkAsync<MappingDto>(await Client.PutAsJsonAsync(
            $"/api/import/csv-mappings/{created.Id}",
            SampleCsv.RevolutBody(name + " card", "signedPositiveIsExpense"),
            TestContext.Current.CancellationToken));
        Assert.Equal((name + " card", "signedPositiveIsExpense"), (updated.Name, updated.AmountStyle));

        Assert.Equal(HttpStatusCode.NoContent, (await Client.DeleteAsync($"/api/import/csv-mappings/{created.Id}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.DoesNotContain(await ListAsync(Client), m => m.Id == created.Id);

        var restored = await Client.PostAsJsonAsync("/api/trash/restore", new { kind = "csvImportMapping", entityId = created.Id }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, restored.StatusCode);
        Assert.Contains(await ListAsync(Client), m => m.Id == created.Id && m.Name == name + " card");
    }

    [Fact]
    public async Task Another_users_mapping_cannot_be_seen_changed_deleted_or_used()
    {
        var mapping = await CreateMappingAsync();
        var other = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: other);

        Assert.DoesNotContain(await ListAsync(other), m => m.Id == mapping);
        await AssertProblemAsync(
            await other.PutAsJsonAsync($"/api/import/csv-mappings/{mapping}", SampleCsv.RevolutBody(), TestContext.Current.CancellationToken),
            HttpStatusCode.NotFound,
            "resource.notFound");
        await AssertProblemAsync(
            await other.DeleteAsync($"/api/import/csv-mappings/{mapping}", TestContext.Current.CancellationToken),
            HttpStatusCode.NotFound,
            "resource.notFound");
        await AssertRejectedAsync(await PreviewAsync(other, account, mapping, SampleCsv.Revolut), "reference.notFound");
    }

    [Theory]
    [InlineData("signedNegativeIsExpense", "dd.mm.yy", "import.invalidDateFormat")]
    [InlineData("debitCredit", "yyyy-MM-dd", "import.mappingIncomplete")]
    public async Task An_incomplete_mapping_is_refused(string amountStyle, string dateFormat, string code)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/import/csv-mappings",
            SampleCsv.RevolutBody(amountStyle: amountStyle, dateFormat: dateFormat),
            TestContext.Current.CancellationToken);

        await AssertRejectedAsync(response, code);
    }

    [Fact]
    public async Task Inspect_proposes_how_to_read_the_file_and_names_the_mappings_that_fit()
    {
        var fits = await CreateMappingAsync();
        var misses = (await PostAsync<IdDto>(Client, "/api/import/csv-mappings", new
        {
            name = "Other",
            encoding = "utf8",
            delimiter = ";",
            skipLines = 0,
            amountStyle = "signedNegativeIsExpense",
            dateFormat = "yyyy-MM-dd",
            decimalSeparator = "comma",
            columns = new { date = "Data", amount = "Suma" },
        })).Id;

        var inspection = await ReadOkAsync<InspectDto>(await UploadAsync(Client, "/api/import/csv/inspect", SampleCsv.Utf8(SampleCsv.Revolut)));

        Assert.Equal(("utf8", ",", 0), (inspection.Encoding, inspection.Delimiter, inspection.SkipLines));
        Assert.Contains(fits, inspection.MatchingMappingIds);
        Assert.DoesNotContain(misses, inspection.MatchingMappingIds);
        Assert.Equal("Type", inspection.Columns[0].Name);
    }

    [Fact]
    public async Task A_mapped_csv_previews_confirms_and_is_then_all_duplicates()
    {
        var account = await CreateAccountAsync("1000.00");
        var mapping = await CreateMappingAsync();
        var tag = await CreateTagAsync();
        var csv = SampleCsv.Revolut.Replace("USD", "EUR", StringComparison.Ordinal);

        var preview = await ReadOkAsync<PreviewDto>(await PreviewAsync(Client, account, mapping, csv));

        Assert.Equal(["Lidl", "Coffee", "Top-up by *1234", "Cash at Vilnius", "Netflix"], preview.Rows.Select(r => r.Description));
        Assert.Equal(("10.50", "expense"), (preview.Rows[3].Amount, preview.Rows[3].Type));
        Assert.Equal((1, 0, "40.01", "eur"), (preview.Statement.NotBooked, preview.Statement.Unreadable, preview.Statement.ClosingBalance, preview.Statement.ClosingCurrency));

        var confirmed = await PostAsync<ConfirmDto>(Client, "/api/import/confirm", new
        {
            accountId = account,
            format = "genericCsv",
            mappingId = mapping,
            rows = preview.Rows.Select(r => new { r.ImportRef, r.Amount, r.Type, r.Date, r.Description, r.Currency, tagIds = new[] { tag } }),
            statement = new { closingDate = preview.Statement.ClosingDate, closingBalance = preview.Statement.ClosingBalance, closingCurrency = "eur" },
        });

        Assert.Equal(5, confirmed.Imported);
        Assert.Equal(("statement", "40.01"), (confirmed.Reconciliation!.Source, confirmed.Reconciliation.Balance));
        Assert.Equal("1460.24", await CurrentBalanceAsync(account));
        var imported = await Client.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?accountId={account}", TestContext.Current.CancellationToken);
        Assert.All(imported!.Items, t => Assert.Equal([tag], t.TagIds));

        var again = await ReadOkAsync<PreviewDto>(await PreviewAsync(Client, account, mapping, csv));
        Assert.All(again.Rows, r => Assert.True(r.IsDuplicate));

        var overlapping = csv + "\nCARD_PAYMENT,Current,2026-09-07 10:00:00,2026-09-07 10:00:01,Bakery,-2.20,0.00,EUR,COMPLETED,1458.04";
        var next = await ReadOkAsync<PreviewDto>(await PreviewAsync(Client, account, mapping, overlapping));
        Assert.Equal([true, true, true, true, true, false], next.Rows.Select(r => r.IsDuplicate));
    }

    [Fact]
    public async Task A_mapped_row_is_offered_the_hand_entered_purchase_and_a_refund_candidate()
    {
        var account = await CreateAccountAsync("100.00");
        var mapping = await CreateMappingAsync();
        var entered = await CreateTransactionAsync(Client, account, null, "expense", "15.77", "2026-09-01", "Lidl groceries");
        await CreateTransactionAsync(Client, account, null, "expense", "20.00", "2026-08-20", "Zara");
        var csv = "Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\n"
            + "CARD_PAYMENT,Current,2026-09-01,2026-09-02,Lidl,-15.77,0,EUR,COMPLETED,\n"
            + "REFUND,Current,2026-09-03,2026-09-03,Zara,19.99,0,EUR,COMPLETED,\n";

        var preview = await ReadOkAsync<PreviewDto>(await PreviewAsync(Client, account, mapping, csv));

        Assert.Equal(entered.Id, preview.Rows[0].MatchedTransaction?.Id);
        Assert.NotNull(preview.Rows[1].RefundCandidate);
        Assert.Null(preview.Statement.ClosingBalance);
    }

    [Fact]
    public async Task Each_row_is_valued_in_its_own_currency_and_a_disabled_one_is_refused()
    {
        var account = await CreateAccountAsync("100.00");
        var mapping = await CreateMappingAsync();
        var preview = await ReadOkAsync<PreviewDto>(await PreviewAsync(Client, account, mapping, SampleCsv.Revolut));
        var netflix = preview.Rows.Single(r => r.Description == "Netflix");
        Assert.Equal("usd", netflix.Currency);

        await using (await OnlyCurrenciesAsync("eur"))
        {
            var response = await Client.PostAsJsonAsync(
                "/api/import/confirm",
                new
                {
                    accountId = account,
                    format = "genericCsv",
                    mappingId = mapping,
                    rows = new[] { new { netflix.ImportRef, netflix.Amount, netflix.Type, netflix.Date, netflix.Description, netflix.Currency } },
                },
                TestContext.Current.CancellationToken);

            await AssertRejectedAsync(response, "currency.disabled");
        }
    }

    [Fact]
    public async Task A_file_without_a_mapped_column_names_it_and_a_missing_mapping_id_is_refused()
    {
        var account = await CreateAccountAsync();
        var mapping = await CreateMappingAsync();

        var missing = await PreviewAsync(Client, account, mapping, "Date,Amount\n2026-09-01,1.00\n");
        var withoutMapping = await PreviewAsync(Client, account, null, SampleCsv.Revolut);

        await AssertRejectedAsync(missing, "import.missingColumns");
        Assert.Contains("Completed Date", await missing.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), StringComparison.Ordinal);
        await AssertValidationErrorAsync(withoutMapping, "mappingId");
    }

    [Fact]
    public async Task A_mapping_without_a_header_row_names_columns_by_position_previews_and_can_go_back_to_names()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: member);
        var created = await ReadOkAsync<MappingDto>(await member.PostAsJsonAsync("/api/import/csv-mappings", PositionalBody(), TestContext.Current.CancellationToken));

        var preview = await ReadOkAsync<PreviewDto>(await PreviewAsync(member, account, created.Id, $"2026-09-02;Lidl {Guid.NewGuid():N};-15,77\n2026-09-04;Salary;2000,00\n"));
        var renamed = await ReadOkAsync<MappingDto>(await member.PutAsJsonAsync(
            $"/api/import/csv-mappings/{created.Id}",
            PositionalBody(noHeaderRow: false, date: "Data", amount: "Suma"),
            TestContext.Current.CancellationToken));

        Assert.Equal(("1", true), (created.Columns.Date, created.NoHeaderRow));
        Assert.Equal([("15.77", "expense"), ("2000.00", "income")], preview.Rows.Select(r => (r.Amount, r.Type)));
        Assert.Equal(0, preview.Statement.Unreadable);
        Assert.Equal(("Data", false), (renamed.Columns.Date, renamed.NoHeaderRow));
    }

    [Theory]
    [InlineData("Data", "2")]
    [InlineData("0", "2")]
    [InlineData("1", "101")]
    public async Task Without_a_header_row_every_column_must_be_a_position(string date, string amount)
    {
        using var member = await CreateUserClientAsync();

        var response = await member.PostAsJsonAsync("/api/import/csv-mappings", PositionalBody(date: date, amount: amount), TestContext.Current.CancellationToken);

        await AssertRejectedAsync(response, "text.invalidFormat");
    }

    [Fact]
    public async Task Inspect_names_only_the_mappings_that_read_a_header_row_as_the_file_does()
    {
        using var member = await CreateUserClientAsync();
        var positional = (await PostAsync<IdDto>(member, "/api/import/csv-mappings", PositionalBody())).Id;
        var named = (await PostAsync<IdDto>(member, "/api/import/csv-mappings", PositionalBody(noHeaderRow: false, date: "1", amount: "3"))).Id;
        var headerless = SampleCsv.Utf8("2026-09-02;Lidl;-15,77\n2026-09-04;Salary;2000,00\n");

        var proposed = await ReadOkAsync<InspectDto>(await UploadAsync(member, "/api/import/csv/inspect", headerless));
        var asHeader = await ReadOkAsync<InspectDto>(await UploadAsync(member, "/api/import/csv/inspect", headerless, ("noHeaderRow", "false")));

        Assert.True(proposed.NoHeaderRow);
        Assert.Equal(["1", "2", "3"], proposed.Columns.Select(c => c.Name));
        Assert.Equal([positional], proposed.MatchingMappingIds);
        Assert.False(asHeader.NoHeaderRow);
        Assert.DoesNotContain(positional, asHeader.MatchingMappingIds);
        Assert.DoesNotContain(named, asHeader.MatchingMappingIds);
    }

    private static object PositionalBody(bool noHeaderRow = true, string date = "1", string amount = "3") => new
    {
        name = $"Card {Guid.NewGuid():N}"[..20],
        encoding = "utf8",
        delimiter = ";",
        skipLines = 0,
        noHeaderRow,
        amountStyle = "signedNegativeIsExpense",
        dateFormat = "yyyy-MM-dd",
        decimalSeparator = "comma",
        columns = new { date, description = noHeaderRow ? "2" : null, amount },
    };

    private async Task<Guid> CreateMappingAsync() =>
        (await PostAsync<IdDto>(Client, "/api/import/csv-mappings", SampleCsv.RevolutBody($"Revolut {Guid.NewGuid():N}"[..20]))).Id;

    private static async Task<List<MappingDto>> ListAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<MappingDto>>("/api/import/csv-mappings", TestContext.Current.CancellationToken))!;

    private static Task<HttpResponseMessage> PreviewAsync(HttpClient client, Guid accountId, Guid? mappingId, string csv) =>
        UploadAsync(
            client,
            "/api/import/preview",
            SampleCsv.Utf8(csv),
            ("accountId", accountId.ToString()),
            ("format", "genericCsv"),
            ("mappingId", mappingId?.ToString()));

    private static async Task<HttpResponseMessage> UploadAsync(
        HttpClient client,
        string url,
        byte[] bytes,
        params (string Name, string? Value)[] fields)
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
        using var form = new MultipartFormDataContent { { file, "file", "export.csv" } };
        foreach (var (name, value) in fields.Where(field => field.Value is not null))
        {
            form.Add(new StringContent(value!), name);
        }

        return await client.PostAsync(url, form, TestContext.Current.CancellationToken);
    }

    private sealed record ColumnsDto(string Date, string? BookedValues);

    private sealed record MappingDto(Guid Id, string Name, string AmountStyle, ColumnsDto Columns, bool NoHeaderRow = false);

    private sealed record InspectColumnDto(string Name);

    private sealed record InspectDto(string Encoding, string Delimiter, int SkipLines, List<InspectColumnDto> Columns, List<Guid> MatchingMappingIds, bool NoHeaderRow = false);

    private sealed record LinkDto(Guid Id);

    private sealed record RowDto(
        string ImportRef,
        DateOnly Date,
        string? Description,
        string Amount,
        string Type,
        string Currency,
        bool IsDuplicate,
        LinkDto? MatchedTransaction,
        LinkDto? RefundCandidate);

    private sealed record StatementDto(int NotBooked, int Unreadable, DateOnly? ClosingDate, string? ClosingBalance, string? ClosingCurrency);

    private sealed record PreviewDto(List<RowDto> Rows, StatementDto Statement);

    private sealed record ConfirmDto(int Imported, ReconciliationDto? Reconciliation);
}
