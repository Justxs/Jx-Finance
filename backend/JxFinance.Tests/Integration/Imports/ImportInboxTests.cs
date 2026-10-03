using System.Net;
using System.Net.Http.Json;
using System.Text;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Infrastructure.Imports;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Imports;

[Collection<ImportsCollection>]
public sealed class ImportInboxTests(ImportsFixture fixture) : IntegrationTestBase(fixture), IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "jx-inbox-job", Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(_root))
            Directory.Delete(_root, recursive: true);
    }

    [Fact]
    public async Task A_camt_statement_in_the_root_waits_for_the_owner_of_the_iban_it_names()
    {
        using var member = await CreateUserClientAsync();
        var (account, iban) = await CreateAccountWithIbanAsync(member);
        var content = Camt(iban);
        Drop("september.xml", content);

        await RunAsync();

        Assert.True(File.Exists(Path.Combine(_root, "done", "september.xml")));
        var waiting = Assert.Single(await ListAsync(member));
        Assert.Equal(("september.xml", "camt053", account, (Guid?)null), (waiting.FileName, waiting.Format, waiting.AccountId, waiting.MappingId));
        Assert.Contains(await Seed.UnreadNotificationsAsync(member), n => n.RelatedId == waiting.Id);
        Assert.Equal(Encoding.UTF8.GetBytes(content), await member.GetByteArrayAsync($"/api/import/inbox/{waiting.Id}/file", TestContext.Current.CancellationToken));
        Assert.DoesNotContain(await ListAsync(Client), f => f.Id == waiting.Id);
    }

    [Fact]
    public async Task A_subfolder_named_after_an_iban_chooses_that_statement_of_several()
    {
        using var member = await CreateUserClientAsync();
        var (account, iban) = await CreateAccountWithIbanAsync(member);
        var unique = Guid.NewGuid().ToString("N");
        string Statements(string tag) => SampleCamt053.Document(
            SampleCamt053.Statement(SampleCamt053.Entry(refs: $"<AcctSvcrRef>{tag}-{unique}</AcctSvcrRef>"), iban)
            + SampleCamt053.Statement(SampleCamt053.Entry(), SampleCamt053.OtherIban));
        Drop(Path.Combine(Spaced(iban).ToLowerInvariant(), "both.xml"), Statements("A"));
        Drop("both.xml", Statements("B"));

        await RunAsync();

        Assert.True(File.Exists(Path.Combine(_root, "done", Spaced(iban).ToLowerInvariant(), "both.xml")));
        Assert.Equal(account, Assert.Single(await ListAsync(member)).AccountId);
        Assert.StartsWith(
            "The file holds several statements",
            await File.ReadAllTextAsync(Path.Combine(_root, "failed", "both.xml.reason.txt"), TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task An_iban_no_account_has_moves_the_file_to_failed_with_the_reason()
    {
        var iban = NewIban();
        Drop("unknown.xml", Camt(iban));

        await RunAsync();

        Assert.Equal(
            $"No account has the IBAN {iban}. Record it on the account first.",
            await File.ReadAllTextAsync(Path.Combine(_root, "failed", "unknown.xml.reason.txt"), TestContext.Current.CancellationToken));
        Assert.True(File.Exists(Path.Combine(_root, "failed", "unknown.xml")));
    }

    [Fact]
    public async Task A_file_the_inbox_already_received_moves_to_done_without_a_second_review()
    {
        using var member = await CreateUserClientAsync();
        var (_, iban) = await CreateAccountWithIbanAsync(member);
        var content = Camt(iban);
        Drop("first.xml", content);
        await RunAsync();
        var first = Assert.Single(await ListAsync(member));
        (await member.DeleteAsync($"/api/import/inbox/{first.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Drop("again.xml", content);

        await RunAsync();

        Assert.True(File.Exists(Path.Combine(_root, "done", "again.xml")));
        Assert.Empty(await ListAsync(member));
    }

    [Fact]
    public async Task A_csv_names_its_account_by_folder_and_is_read_with_the_one_mapping_that_fits()
    {
        using var member = await CreateUserClientAsync();
        var (account, iban) = await CreateAccountWithIbanAsync(member);
        var mapping = await CreateMappingAsync(member, "Revolut");
        Drop(Path.Combine(iban, "revolut.csv"), Revolut());
        Drop("loose.csv", Revolut());

        await RunAsync();

        var waiting = Assert.Single(await ListAsync(member));
        Assert.Equal(("genericCsv", account, (Guid?)mapping), (waiting.Format, waiting.AccountId, waiting.MappingId));
        Assert.StartsWith(
            "A CSV file names no account.",
            await File.ReadAllTextAsync(Path.Combine(_root, "failed", "loose.csv.reason.txt"), TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_csv_no_mapping_reads_is_taken_as_swedbank_or_refused()
    {
        using var member = await CreateUserClientAsync();
        var (_, iban) = await CreateAccountWithIbanAsync(member);
        Drop(Path.Combine(iban, "swedbank.csv"), Swedbank());
        Drop(Path.Combine(iban, "revolut.csv"), Revolut());

        await RunAsync();

        Assert.Equal("swedbankCsv", Assert.Single(await ListAsync(member)).Format);
        Assert.StartsWith(
            "None of the account owner's saved CSV mappings reads this file.",
            await File.ReadAllTextAsync(Path.Combine(_root, "failed", iban, "revolut.csv.reason.txt"), TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_csv_two_mappings_read_is_refused_rather_than_guessed()
    {
        using var member = await CreateUserClientAsync();
        var (_, iban) = await CreateAccountWithIbanAsync(member);
        await CreateMappingAsync(member, "Card A");
        await CreateMappingAsync(member, "Card B");
        Drop(Path.Combine(iban, "revolut.csv"), Revolut());

        await RunAsync();

        Assert.Empty(await ListAsync(member));
        Assert.Contains(
            "(Card A, Card B)",
            await File.ReadAllTextAsync(Path.Combine(_root, "failed", iban, "revolut.csv.reason.txt"), TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_dismissed_file_leaves_the_list_and_its_bytes_and_is_not_found_again()
    {
        using var member = await CreateUserClientAsync();
        using var other = await CreateUserClientAsync();
        var (_, iban) = await CreateAccountWithIbanAsync(member);
        Drop("statement.xml", Camt(iban));
        await RunAsync();
        var waiting = Assert.Single(await ListAsync(member));

        await AssertProblemAsync(await other.GetAsync($"/api/import/inbox/{waiting.Id}/file", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "resource.notFound");
        await AssertProblemAsync(await other.DeleteAsync($"/api/import/inbox/{waiting.Id}", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "resource.notFound");
        Assert.Equal(HttpStatusCode.NoContent, (await member.DeleteAsync($"/api/import/inbox/{waiting.Id}", TestContext.Current.CancellationToken)).StatusCode);

        Assert.Empty(await ListAsync(member));
        Assert.Null(await WithDbAsync(db => db.ImportInboxFiles.IgnoreQueryFilters()
            .Where(f => f.Id == new Domain.Imports.ImportInboxFileId(waiting.Id))
            .Select(f => f.Content)
            .SingleAsync(TestContext.Current.CancellationToken)));
        await AssertProblemAsync(await member.GetAsync($"/api/import/inbox/{waiting.Id}/file", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "resource.notFound");
        await AssertProblemAsync(await member.DeleteAsync($"/api/import/inbox/{waiting.Id}", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "resource.notFound");
    }

    [Fact]
    public async Task A_file_whose_account_was_deleted_leaves_the_list()
    {
        using var member = await CreateUserClientAsync();
        var (account, iban) = await CreateAccountWithIbanAsync(member);
        Drop("statement.xml", Camt(iban));
        await RunAsync();
        Assert.Single(await ListAsync(member));

        (await member.DeleteAsync($"/api/accounts/{account}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Empty(await ListAsync(member));
    }

    [Fact]
    public async Task The_status_is_for_administrators_and_says_the_inbox_is_off_without_a_folder()
    {
        using var member = await CreateUserClientAsync();

        Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync("/api/import/inbox/status", TestContext.Current.CancellationToken)).StatusCode);
        var status = await ReadOkAsync<StatusDto>(await Client.GetAsync("/api/import/inbox/status", TestContext.Current.CancellationToken));
        Assert.Null(status.Directory);
        Assert.Empty(status.Failures);
    }

    [Fact]
    public async Task With_import_off_the_job_leaves_the_folder_and_the_routes_are_disabled()
    {
        using var member = await CreateUserClientAsync();
        var (_, iban) = await CreateAccountWithIbanAsync(member);
        Drop("statement.xml", Camt(iban));

        await using (await FeatureOffAsync("import"))
        {
            await RunAsync();

            Assert.True(File.Exists(Path.Combine(_root, "statement.xml")));
            await AssertProblemAsync(await member.GetAsync("/api/import/inbox", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "feature.disabled");
        }
    }

    [Fact]
    public async Task Retention_deletes_inbox_rows_ninety_days_after_they_arrived()
    {
        using var member = await CreateUserClientAsync();
        var (_, iban) = await CreateAccountWithIbanAsync(member);
        Drop("old.xml", Camt(iban));
        Drop("recent.xml", Camt(iban));
        await RunAsync();
        var waiting = await ListAsync(member);
        var old = waiting.Single(f => f.FileName == "old.xml").Id;
        var recent = waiting.Single(f => f.FileName == "recent.xml").Id;
        await SqlAsync($"""UPDATE "ImportInboxFiles" SET "CreatedAt" = now() - interval '91 days' WHERE "Id" = {old}""");
        await SqlAsync($"""UPDATE "ImportInboxFiles" SET "CreatedAt" = now() - interval '89 days' WHERE "Id" = {recent}""");

        await Job<RetentionJob>().RunOnceAsync(TestContext.Current.CancellationToken);

        Assert.Equal([recent], (await ListAsync(member)).Select(f => f.Id));
        Assert.Equal(0, await SqlValueAsync<int>($"""SELECT count(*)::int AS "Value" FROM "ImportInboxFiles" WHERE "Id" = {old}"""));
    }

    private Task RunAsync() =>
        Job<ImportInboxJob>(new ImportInboxFolder(_root, new TestClock(DateTimeOffset.UtcNow))).RunOnceAsync(TestContext.Current.CancellationToken);

    private void Drop(string relativePath, string content)
    {
        var path = Path.Combine(_root, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content);
        File.SetLastWriteTimeUtc(path, DateTime.UtcNow.AddMinutes(-2));
    }

    private static async Task<List<InboxFileDto>> ListAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<InboxFileDto>>("/api/import/inbox", TestContext.Current.CancellationToken))!;

    private static async Task<Guid> CreateMappingAsync(HttpClient client, string name) =>
        (await PostAsync<IdDto>(client, "/api/import/csv-mappings", SampleCsv.RevolutBody(name))).Id;

    private static async Task<(Guid Id, string Iban)> CreateAccountWithIbanAsync(HttpClient client)
    {
        var iban = NewIban();
        var created = await PostAsync<IdDto>(
            client,
            "/api/accounts",
            new { name = $"Account {Guid.NewGuid():N}", type = "checking", startingBalance = "0.00", iban = Spaced(iban), scope = "personal" });
        return (created.Id, iban);
    }

    private static string NewIban() => $"LT{Random.Shared.NextInt64(100_000_000_000_000_000, 999_999_999_999_999_999)}";

    private static string Spaced(string iban) => string.Join(' ', iban.Chunk(4).Select(part => new string(part)));

    private static string Camt(string iban) =>
        SampleCamt053.Document(SampleCamt053.Statement(SampleCamt053.Entry(refs: $"<AcctSvcrRef>{Guid.NewGuid():N}</AcctSvcrRef>"), iban));

    private static string Revolut() =>
        SampleCsv.Revolut.Replace("USD", "EUR", StringComparison.Ordinal).Replace("Coffee", $"Coffee {Guid.NewGuid():N}", StringComparison.Ordinal);

    private static string Swedbank() =>
        "\"Sąskaitos Nr.\",\"\",\"Data\",\"Gavėjas\",\"Paaiškinimai\",\"Suma\",\"Valiuta\",\"D/K\",\"Įrašo Nr.\"\n"
        + $"\"LT476300010172306416\",\"20\",\"2026-05-02\",\"LIDL\",\"PIRKINYS LIDL\",\"15.77\",\"EUR\",\"D\",\"INBOX-{Guid.NewGuid():N}\"\n";

    private sealed record InboxFileDto(Guid Id, string FileName, string Format, Guid AccountId, Guid? MappingId, DateTimeOffset ReceivedAt);

    private sealed record FailureDto(string FileName, string Reason, DateTimeOffset At);

    private sealed record StatusDto(string? Directory, List<FailureDto> Failures);
}
