using System.Globalization;
using System.Net.Http.Json;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Imports;

[Collection<ImportsCollection>]
public sealed class StatementPayeeTests(ImportsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Header = "\"Sąskaitos Nr.\",\"\",\"Data\",\"Gavėjas\",\"Paaiškinimai\",\"Suma\",\"Valiuta\",\"D/K\",\"Įrašo Nr.\"\n";

    [Fact]
    public async Task A_confirmed_row_keeps_its_payee_trimmed_and_is_keyed_by_it()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: member);

        var id = await ConfirmOneAsync(member, account, "  MAXIMA LT, UAB  ", "PIRKINYS *1234 VILNIUS");

        Assert.Equal("MAXIMA LT, UAB", (await GetAsync(member, id)).Payee);
        Assert.Equal(("MAXIMA LT, UAB", "maxima lt uab"), await StoredAsync(id));
    }

    [Fact]
    public async Task Editing_the_description_keeps_the_payee_key_and_a_row_without_a_payee_is_keyed_by_its_description()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: member);
        var imported = await ConfirmOneAsync(member, account, "MAXIMA LT, UAB", "PIRKINYS *1234 VILNIUS");
        var typed = await CreateTransactionAsync(member, account, null, "expense", "4.00", "2026-09-03", "Kiosk 0042");

        await EditDescriptionAsync(member, imported, account, "Weekly groceries");
        await EditDescriptionAsync(member, typed.Id, account, "Bakery 0043");

        Assert.Equal(("MAXIMA LT, UAB", "maxima lt uab"), await StoredAsync(imported));
        Assert.Equal(((string?)null, "bakery"), await StoredAsync(typed.Id));
    }

    [Fact]
    public async Task The_backfill_keys_a_row_by_its_payee()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: member);
        var id = await ConfirmOneAsync(member, account, "Rimi Lietuva", "PIRKINYS *1234");
        await SqlAsync($"""UPDATE "Transactions" SET "PayeeKey" = NULL WHERE "Id" = {id}""");

        await WithDbAsync(db => PayeeKeyBackfill.RunAsync(db, TestContext.Current.CancellationToken));

        Assert.Equal("rimi lietuva", (await StoredAsync(id)).Key);
    }

    [Fact]
    public async Task The_ledger_search_matches_the_payee()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: member);
        var marker = $"Shop{Guid.NewGuid():N}"[..14];
        var id = await ConfirmOneAsync(member, account, $"{marker} UAB", "PIRKINYS *1234");

        var found = await member.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?search={marker.ToLowerInvariant()}", TestContext.Current.CancellationToken);

        Assert.Equal(id, Assert.Single(found!.Items).Id);
    }

    [Fact]
    public async Task A_payee_longer_than_two_hundred_characters_is_refused()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: member);

        var response = await member.PostAsJsonAsync(
            "/api/import/confirm",
            new { accountId = account, rows = new[] { Row(new string('M', 201), "PIRKINYS") } },
            TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "rows[0].payee");
    }

    [Fact]
    public async Task The_preview_judges_unusual_amounts_and_learns_categories_by_the_payee_key()
    {
        await using var learned = await LearnedCategoriesOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        var groceries = await CreateCategoryAsync(client: member);
        foreach (var (amount, daysAgo) in new[] { ("15.00", 7), ("16.00", 14), ("15.00", 21), ("17.00", 28) })
        {
            await CreateTransactionAsync(member, account, groceries, "expense", amount, DateText(daysAgo), "MAXIMA LT, UAB");
        }

        var csv = Header + $"\"LT476300010172306416\",\"20\",\"{DateText(1)}\",\"MAXIMA LT, UAB\",\"PIRKINYS KORTELE {Guid.NewGuid():N}\",\"160.00\",\"EUR\",\"D\",\"PAYEE-{Guid.NewGuid():N}\"\n";

        var row = Assert.Single((await ReadOkAsync<PreviewDto>(await UploadCsvAsync(member, account, csv))).Rows);

        Assert.Equal("MAXIMA LT, UAB", row.Payee);
        Assert.Equal(groceries, row.LearnedCategoryId);
        Assert.NotNull(row.Unusual);
    }

    private async Task<Guid> ConfirmOneAsync(HttpClient client, Guid account, string payee, string description)
    {
        var importRef = $"PAYEE-{Guid.NewGuid():N}";
        await PostAsync<ConfirmDto>(client, "/api/import/confirm", new { accountId = account, rows = new[] { Row(payee, description, importRef) } });
        return await WithDbAsync(db => db.Transactions.IgnoreQueryFilters()
            .Where(t => t.ImportRef == importRef)
            .Select(t => t.Id.Value)
            .SingleAsync(TestContext.Current.CancellationToken));
    }

    private static object Row(string payee, string description, string? importRef = null) =>
        new { importRef = importRef ?? $"PAYEE-{Guid.NewGuid():N}", date = "2026-09-02", description, amount = "12.40", type = "expense", payee };

    private static async Task EditDescriptionAsync(HttpClient client, Guid id, Guid account, string description) =>
        (await client.PutAsJsonAsync(
            $"/api/transactions/{id}",
            new { id, accountId = account, type = "expense", amount = "12.40", date = "2026-09-02", description },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

    private static async Task<PayeeDto> GetAsync(HttpClient client, Guid id) =>
        (await client.GetFromJsonAsync<PayeeDto>($"/api/transactions/{id}", TestContext.Current.CancellationToken))!;

    private Task<(string? Payee, string? Key)> StoredAsync(Guid id) =>
        WithDbAsync(async db =>
        {
            var row = await db.Transactions.IgnoreQueryFilters()
                .Where(t => t.Id == new TransactionId(id))
                .Select(t => new { t.Payee, t.PayeeKey })
                .SingleAsync(TestContext.Current.CancellationToken);
            return (row.Payee, row.PayeeKey);
        });

    private string DateText(int daysAgo) => Today.AddDays(-daysAgo).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private sealed record PayeeDto(Guid Id, string? Payee);

    private sealed record ConfirmDto(int Imported);

    private sealed record UnusualDto(string Basis);

    private sealed record PreviewRowDto(string? Payee, Guid? LearnedCategoryId, UnusualDto? Unusual);

    private sealed record PreviewDto(List<PreviewRowDto> Rows);
}
