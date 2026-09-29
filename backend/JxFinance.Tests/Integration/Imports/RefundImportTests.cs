using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Imports;

[Collection<IntegrationCollection>]
public sealed class RefundImportTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Header = "\"Sąskaitos Nr.\",\"\",\"Data\",\"Gavėjas\",\"Paaiškinimai\",\"Suma\",\"Valiuta\",\"D/K\",\"Įrašo Nr.\"\n";

    [Fact]
    public async Task A_credit_from_a_payee_paid_before_is_proposed_as_a_refund_and_written_as_one()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: member);
        var shoes = await CreateCategoryAsync(client: member);
        await CreateTransactionAsync(member, account, shoes, "expense", "80.00", "2026-01-15", "Sportland");
        var purchase = await CreateTransactionAsync(member, account, shoes, "expense", "60.00", "2026-05-01", "Sportland");
        await CreateTransactionAsync(member, account, shoes, "expense", "10.00", "2026-05-10", "Sportland");
        var reference = Guid.NewGuid().ToString("N")[..10];
        var csv = Header + Line("2026-05-20", "SPORTLAND", "Grazinimas", "40.00", "K", reference);

        var preview = await ReadOkAsync<PreviewDto>(await UploadCsvAsync(member, account, csv));

        var row = Assert.Single(preview.Rows);
        Assert.Equal(new CandidateDto(purchase.Id, new DateOnly(2026, 5, 1), "Sportland", shoes), row.RefundCandidate);

        var confirmed = await PostAsync<ConfirmDto>(member, "/api/import/confirm", new
        {
            accountId = account,
            rows = new[] { Row(row, shoes, asRefund: true, refundOfTransactionId: purchase.Id) },
        });

        Assert.Equal(1, confirmed.Imported);
        var page = await member.GetFromJsonAsync<PageDto<LedgerRowDto>>($"/api/transactions?accountId={account}", TestContext.Current.CancellationToken);
        var refund = page!.Items.Single(t => t.Source == "imported");
        Assert.Equal(("expense", "-40.00", shoes, purchase.Id), (refund.Type, refund.Amount, refund.CategoryId, refund.RefundOf?.Id));
        Assert.Equal("40.00", page.Items.Single(t => t.Id == purchase.Id).RefundedAmount);
        Assert.Equal("-10.00", await CurrentBalanceAsync(account, member));
    }

    [Fact]
    public async Task A_camt_reversal_carries_its_mark_and_the_purchase_it_reverses()
    {
        using var member = await CreateUserClientAsync();
        var iban = $"LT{Random.Shared.NextInt64(100_000_000_000_000_000, 999_999_999_999_999_999)}";
        var account = (await PostAsync<IdDto>(member, "/api/accounts", new { name = $"Account {Guid.NewGuid():N}", type = "checking", startingBalance = "100.00", iban, scope = "personal" })).Id;
        var purchase = await CreateTransactionAsync(member, account, null, "expense", "15.77", "2026-08-30", "Lidl Lietuva");
        var entry = SampleCamt053.Entry(
            SampleCamt053.Detail(parties: "<Dbtr><Nm>LIDL LIETUVA</Nm></Dbtr>", refs: $"<AcctSvcrRef>{Guid.NewGuid():N}</AcctSvcrRef>"),
            direction: "CRDT",
            extra: "<RvslInd>true</RvslInd>");

        var preview = await ReadOkAsync<PreviewDto>(await UploadCamtAsync(member, account, SampleCamt053.Document(SampleCamt053.Statement(entry, iban))));

        var row = Assert.Single(preview.Rows);
        Assert.True(row.IsReversal);
        Assert.Equal(purchase.Id, row.RefundCandidate?.Id);
    }

    [Fact]
    public async Task A_hand_entered_refund_is_offered_as_the_bank_credit_it_matches()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: member);
        var refund = await CreateTransactionAsync(member, account, null, "expense", "-12.00", "2026-06-03", "Returned mug");
        var reference = Guid.NewGuid().ToString("N")[..10];

        var preview = await ReadOkAsync<PreviewDto>(await UploadCsvAsync(member, account, Header + Line("2026-06-04", "", "Pinigu grazinimas", "12.00", "K", reference)));

        var row = Assert.Single(preview.Rows);
        Assert.Equal(refund.Id, row.MatchedTransaction?.Id);
        Assert.Null(row.RefundCandidate);
        var linked = await PostAsync<ConfirmDto>(member, "/api/import/confirm", new { accountId = account, rows = new[] { Row(row, null, existingTransactionId: refund.Id) } });
        Assert.Equal(1, linked.Linked);
        Assert.Equal("112.00", await CurrentBalanceAsync(account, member));
    }

    [Fact]
    public async Task A_refund_row_that_breaks_the_rules_is_refused()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var salary = await CreateCategoryAsync("income", member);
        var income = await CreateTransactionAsync(member, account, salary, "income", "900.00", "2026-06-01");
        var other = await CreateAccountAsync(client: member);

        await AssertProblemAsync(await ConfirmRawAsync(member, account, new { importRef = "r-1", date = "2026-06-05", amount = "5.00", type = "expense", asRefund = true }), HttpStatusCode.BadRequest, "import.refundInvalid");
        await AssertProblemAsync(await ConfirmRawAsync(member, account, new { importRef = "r-2", date = "2026-06-05", amount = "5.00", type = "income", asRefund = true, transferAccountId = other }), HttpStatusCode.BadRequest, "import.refundInvalid");
        await AssertProblemAsync(await ConfirmRawAsync(member, account, new { importRef = "r-3", date = "2026-06-05", amount = "5.00", type = "income", refundOfTransactionId = income.Id }), HttpStatusCode.BadRequest, "import.refundInvalid");
        await AssertProblemAsync(await ConfirmRawAsync(member, account, new { importRef = "r-4", date = "2026-06-05", amount = "5.00", type = "income", asRefund = true, categoryId = salary }), HttpStatusCode.BadRequest, "category.wrongType");
        await AssertProblemAsync(await ConfirmRawAsync(member, account, new { importRef = "r-5", date = "2026-06-05", amount = "5.00", type = "income", asRefund = true, categoryId = food, refundOfTransactionId = income.Id }), HttpStatusCode.BadRequest, "transaction.refundOriginalInvalid");
        Assert.Equal("1000.00", await CurrentBalanceAsync(account, member));
    }

    private static string Line(string date, string payee, string description, string amount, string direction, string reference) =>
        $"\"LT476300010172306416\",\"20\",\"{date}\",\"{payee}\",\"{description}\",\"{amount}\",\"EUR\",\"{direction}\",\"REFUND-{reference}\"\n";

    private static object Row(
        PreviewRowDto row,
        Guid? categoryId,
        bool asRefund = false,
        Guid? refundOfTransactionId = null,
        Guid? existingTransactionId = null) =>
        new { row.ImportRef, row.Date, row.Description, row.Amount, row.Type, categoryId, asRefund, refundOfTransactionId, existingTransactionId };

    private static Task<HttpResponseMessage> ConfirmRawAsync(HttpClient client, Guid accountId, object row) =>
        client.PostAsJsonAsync("/api/import/confirm", new { accountId, rows = new[] { row } }, TestContext.Current.CancellationToken);

    private sealed record CandidateDto(Guid Id, DateOnly Date, string? Description, Guid? CategoryId);

    private sealed record PreviewRowDto(
        string ImportRef,
        DateOnly Date,
        string? Description,
        string Amount,
        string Type,
        bool IsReversal,
        CandidateDto? MatchedTransaction,
        CandidateDto? RefundCandidate);

    private sealed record PreviewDto(List<PreviewRowDto> Rows);

    private sealed record ConfirmDto(int Imported, int SkippedDuplicates, int Linked);

    private sealed record RefundOfDto(Guid Id);

    private sealed record LedgerRowDto(Guid Id, string Type, string Amount, Guid? CategoryId, string Source, RefundOfDto? RefundOf, string? RefundedAmount);
}
