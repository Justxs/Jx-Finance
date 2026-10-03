using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Payees;

[Collection<IntegrationCollection>]
public sealed class PayeeNameTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_name_given_from_a_raw_description_shows_on_every_row_of_that_payee_and_in_the_report()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await CreateTransactionAsync(member, account, null, "expense", "12.40", "2026-04-02", "MAXIMA LT, UAB 20260402");
        await CreateTransactionAsync(member, account, null, "expense", "7.60", "2026-04-18", "Maxima LT UAB 20260418");
        await CreateTransactionAsync(member, account, null, "expense", "3.00", "2026-04-18", "Rimi");

        var named = await ReadOkAsync<PayeeNameDto>(await SetAsync(member, "MAXIMA LT, UAB 4412", "  Maxima  "));
        var rows = await RowsAsync(member, "dateFrom=2026-04-01&dateTo=2026-04-30");
        var found = await RowsAsync(member, "search=maxima");
        var report = (await member.GetFromJsonAsync<ReportDto>("/api/reports/summary?dateFrom=2026-04-01&dateTo=2026-04-30", TestContext.Current.CancellationToken))!;

        Assert.Equal(("maxima lt uab", "Maxima"), (named.PayeeKey, named.Name));
        Assert.Equal(["Maxima", "Maxima", null], rows.Items.OrderBy(r => r.Description == "Rimi").Select(r => r.PayeeName));
        Assert.Equal(2, found.Total);
        Assert.Equal("Maxima", report.ExpenseByPayee.Single(p => p.PayeeKey == "maxima lt uab").Name);
        Assert.Null(report.ExpenseByPayee.Single(p => p.PayeeKey == "rimi").Name);
    }

    [Fact]
    public async Task Naming_the_same_payee_again_renames_it_and_removing_it_brings_back_the_bank_text()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await CreateTransactionAsync(member, account, null, "expense", "9.99", "2026-04-03", "NETFLIX.COM 4412");

        var first = await ReadOkAsync<PayeeNameDto>(await SetAsync(member, "NETFLIX.COM 4412", "Netflix"));
        var renamed = await ReadOkAsync<PayeeNameDto>(await SetAsync(member, "netflix com", "Netflix family"));
        var list = await member.GetFromJsonAsync<List<PayeeNameDto>>("/api/payees", TestContext.Current.CancellationToken);
        var deleted = await member.DeleteAsync($"/api/payees/{first.Id}", TestContext.Current.CancellationToken);
        var afterDelete = await RowsAsync(member, "search=netflix");

        Assert.Equal(first.Id, renamed.Id);
        Assert.Equal(["Netflix family"], list!.Select(p => p.Name));
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Null(Assert.Single(afterDelete.Items).PayeeName);
        Assert.Empty((await member.GetFromJsonAsync<List<PayeeNameDto>>("/api/payees", TestContext.Current.CancellationToken))!);
    }

    [Fact]
    public async Task Names_are_personal_even_on_a_shared_account()
    {
        using var pair = await CreateHouseholdPairAsync();
        var (owner, partner) = (pair.OwnerClient, pair.PartnerClient);
        var shared = await CreateAccountAsync("1000.00", client: owner, householdId: pair.HouseholdId);
        await CreateTransactionAsync(owner, shared, null, "expense", "5.00", "2026-04-03", "Bolt ride 12345");
        await SetAsync(owner, "Bolt ride", "Taxi");

        var partnerRows = await RowsAsync(partner, "search=bolt");
        var partnerNames = await partner.GetFromJsonAsync<List<PayeeNameDto>>("/api/payees", TestContext.Current.CancellationToken);

        Assert.Null(Assert.Single(partnerRows.Items).PayeeName);
        Assert.Empty(partnerNames!);
    }

    [Fact]
    public async Task The_switch_off_shows_the_bank_text_and_closes_the_routes_until_it_is_on_again()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await CreateTransactionAsync(member, account, null, "expense", "4.20", "2026-04-05", "LIDL 0042 VILNIUS");
        await SetAsync(member, "LIDL 0042 VILNIUS", "Groceries");

        await using (await FeatureOffAsync("payeeNames"))
        {
            var rows = await RowsAsync(member, "dateFrom=2026-04-01&dateTo=2026-04-30");
            var found = await RowsAsync(member, "search=groceries");
            var report = (await member.GetFromJsonAsync<ReportDto>("/api/reports/summary?dateFrom=2026-04-01&dateTo=2026-04-30", TestContext.Current.CancellationToken))!;

            Assert.Null(Assert.Single(rows.Items).PayeeName);
            Assert.Equal(0, found.Total);
            Assert.Null(Assert.Single(report.ExpenseByPayee).Name);
            await AssertProblemAsync(await member.GetAsync("/api/payees", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "feature.disabled");
            await AssertProblemAsync(await SetAsync(member, "LIDL 0042 VILNIUS", "Lidl"), HttpStatusCode.NotFound, "feature.disabled");
        }

        Assert.Equal("Groceries", Assert.Single((await RowsAsync(member, "search=groceries")).Items).PayeeName);
    }

    [Fact]
    public async Task A_payee_with_nothing_left_after_normalizing_is_rejected()
    {
        using var member = await CreateUserClientAsync();

        await AssertValidationErrorAsync(await SetAsync(member, "12345 ,,", "Name"), "payee");
    }

    private static Task<HttpResponseMessage> SetAsync(HttpClient client, string payee, string name) =>
        client.PutAsJsonAsync("/api/payees", new { payee, name }, TestContext.Current.CancellationToken);

    private static async Task<PageDto<RowDto>> RowsAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<PageDto<RowDto>>($"/api/transactions?pageSize=50&{query}", TestContext.Current.CancellationToken))!;

    private sealed record PayeeNameDto(Guid Id, string PayeeKey, string Name);

    private sealed record RowDto(Guid Id, string? Description, string? PayeeName);

    private sealed record PayeeItemDto(string? PayeeKey, string? Name);

    private sealed record ReportDto(List<PayeeItemDto> ExpenseByPayee);
}
