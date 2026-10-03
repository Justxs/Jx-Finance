using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<LedgerCollection>]
public sealed class TransactionNoteTests(LedgerFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_note_is_kept_found_by_the_search_exported_and_cleared_by_an_update_without_it()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var created = await PostAsync<NoteRowDto>(member, "/api/transactions", Body(account, "  Tom's birthday gift  "));
        await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-04-03", "Rimi");

        var found = (await member.GetFromJsonAsync<PageDto<NoteRowDto>>("/api/transactions?search=birthday", TestContext.Current.CancellationToken))!;
        var csv = await member.GetStringAsync("/api/transactions/export?search=birthday", TestContext.Current.CancellationToken);
        var updated = await ReadOkAsync<NoteRowDto>(await member.PutAsJsonAsync($"/api/transactions/{created.Id}", Body(account, null), TestContext.Current.CancellationToken));

        Assert.Equal("Tom's birthday gift", created.Note);
        Assert.Equal([created.Id], found.Items.Select(t => t.Id));
        var lines = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        Assert.EndsWith(",Note,Spread months,Place,Group", lines[0]);
        Assert.EndsWith(",EUR,Tom's birthday gift,,,", lines[1]);
        Assert.Null(updated.Note);
    }

    [Fact]
    public async Task A_note_longer_than_1000_characters_is_rejected()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);

        var response = await member.PostAsJsonAsync("/api/transactions", Body(account, new string('a', 1001)), TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "note");
    }

    private static object Body(Guid account, string? note) =>
        new { accountId = account, type = "expense", amount = "35.00", date = "2026-04-02", description = "MAXIMA LT 1234", note };

    private sealed record NoteRowDto(Guid Id, string? Description, string? Note);
}
