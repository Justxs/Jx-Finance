using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using JxFinance.Domain.Investments;
using JxFinance.Endpoints.Backups.Services;
using JxFinance.Endpoints.Users.Services;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Users;

[Collection<IntegrationCollection>]
public sealed partial class UserImportTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string ImportUrl = "/api/users/me/import";
    private const string OlderMigration = "20261001175018_AddImportInbox";

    [Fact]
    public async Task A_download_moves_into_an_empty_member_with_its_files()
    {
        using var source = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: source);
        var tag = await CreateTagAsync(client: source);
        var entry = await RecordTransactionAsync(source, new
        {
            accountId = account,
            type = "expense",
            amount = "12.50",
            date = "2026-07-01",
            description = "Groceries",
            tagIds = new[] { tag },
        });
        var receipt = Encoding.ASCII.GetBytes($"%PDF-1.7\n% moved {Guid.NewGuid():N}\n%%EOF");
        await UploadAttachmentAsync(source, entry.Id, receipt);
        var export = await DownloadAsync(source);
        using (var archive = new ZipArchive(new MemoryStream(export), ZipArchiveMode.Read))
        {
            Assert.NotNull(archive.GetEntry(UserExportService.JournalEntry));
        }

        using var target = await CreateUserClientAsync();

        var imported = await ReadOkAsync<ImportDto>(await ImportAsync(target, WithNewIds(export)));
        var accounts = (await target.GetFromJsonAsync<List<NamedDto>>("/api/accounts", TestContext.Current.CancellationToken))!;
        var moved = Assert.Single(accounts);
        var entries = (await target.GetFromJsonAsync<PageDto<EntryDto>>($"/api/transactions?accountId={moved.Id}", TestContext.Current.CancellationToken))!;
        var movedEntry = Assert.Single(entries.Items);
        var attachments = (await target.GetFromJsonAsync<List<AttachmentDto>>($"/api/transactions/{movedEntry.Id}/attachments", TestContext.Current.CancellationToken))!;
        var again = await ImportAsync(target, WithNewIds(export));

        Assert.Equal(1, imported.Attachments);
        Assert.Equal(0, imported.Removed);
        Assert.Single(movedEntry.TagIds);
        var attachment = Assert.Single(attachments);
        var file = await target.GetByteArrayAsync($"/api/attachments/{attachment.Id}/content", TestContext.Current.CancellationToken);
        Assert.Equal(receipt, file);
        await AssertProblemAsync(again, HttpStatusCode.BadRequest, "import.targetNotEmpty");
    }

    [Fact]
    public async Task Records_that_already_exist_here_roll_the_whole_import_back()
    {
        using var source = await CreateUserClientAsync();
        await CreateAccountAsync(client: source);
        var export = await DownloadAsync(source);
        using var target = await CreateUserClientAsync();

        var response = await ImportAsync(target, export);
        var accounts = (await target.GetFromJsonAsync<List<NamedDto>>("/api/accounts", TestContext.Current.CancellationToken))!;

        await AssertProblemAsync(response, HttpStatusCode.Conflict, "import.alreadyPresent");
        Assert.Empty(accounts);
    }

    [Fact]
    public async Task A_file_that_is_not_a_data_export_is_refused()
    {
        using var target = await CreateUserClientAsync();

        var response = await ImportAsync(target, Encoding.UTF8.GetBytes("not a zip"));

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "import.invalidFile");
    }

    [Fact]
    public async Task A_download_from_an_older_version_takes_the_defaults_and_the_startup_fills_of_what_came_later()
    {
        using var source = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: source);
        await RecordTransactionAsync(source, new { accountId = account, type = "expense", amount = "360.00", date = "2026-01-15", description = "Insurance", spreadMonths = 12 });
        await PostAsync<IdDto>(source, "/api/debts", new { name = "Car loan", type = "loan", outstandingAmount = "900.00", asOf = "2026-03-01" });
        var older = WithData(WithNewIds(await DownloadAsync(source)), document =>
        {
            document[BackupJsonNames.Migration] = OlderMigration;
            DropColumns(document, "Transactions", "Payee", "SpreadDirection", "SpreadFrom");
            var tables = document[BackupJsonNames.Tables]!.AsArray();
            tables.Remove(Table(document, "DebtBalanceEntries"));
        });
        using var target = await CreateUserClientAsync();

        await ReadOkAsync<ImportDto>(await ImportAsync(target, older));
        var moved = Assert.Single((await target.GetFromJsonAsync<PageDto<SpreadEntryDto>>("/api/transactions", TestContext.Current.CancellationToken))!.Items);
        var debt = Assert.Single((await target.GetFromJsonAsync<List<DebtDto>>("/api/debts", TestContext.Current.CancellationToken))!);
        var balances = await target.GetFromJsonAsync<List<DebtBalanceDto>>($"/api/debts/{debt.Id}/balances", TestContext.Current.CancellationToken);

        Assert.Equal((12, "forward", new DateOnly(2026, 1, 15), new DateOnly(2026, 12, 15)), (moved.SpreadMonths, moved.SpreadDirection, moved.SpreadFrom, moved.SpreadUntil));
        Assert.Equal([new DebtBalanceDto(new DateOnly(2026, 3, 1), "900.00", null)], balances);
    }

    [Theory]
    [InlineData("29990101000000_FromAFutureVersion", "import.newerVersion")]
    [InlineData("20000101000000_NeverShipped", "import.unknownVersion")]
    public async Task A_download_from_a_version_this_application_does_not_know_is_refused(string migration, string code)
    {
        using var source = await CreateUserClientAsync();
        await CreateAccountAsync(client: source);
        var file = WithData(WithNewIds(await DownloadAsync(source)), document => document[BackupJsonNames.Migration] = migration);
        using var target = await CreateUserClientAsync();

        await AssertProblemAsync(await ImportAsync(target, file), HttpStatusCode.BadRequest, code);
        Assert.Empty((await target.GetFromJsonAsync<List<NamedDto>>("/api/accounts", TestContext.Current.CancellationToken))!);
    }

    [Fact]
    public async Task A_column_the_table_no_longer_has_is_refused()
    {
        using var source = await CreateUserClientAsync();
        await CreateAccountAsync(client: source);
        var file = WithData(WithNewIds(await DownloadAsync(source)), document =>
        {
            document[BackupJsonNames.Migration] = OlderMigration;
            var accounts = Table(document, "Accounts");
            accounts[BackupJsonNames.Columns]!.AsArray().Add("RetiredColumn");
            foreach (var row in accounts[BackupJsonNames.Rows]!.AsArray())
            {
                row!.AsArray().Add("old value");
            }
        });
        using var target = await CreateUserClientAsync();

        await AssertProblemAsync(await ImportAsync(target, file), HttpStatusCode.BadRequest, "import.invalidFile");
        Assert.Empty((await target.GetFromJsonAsync<List<NamedDto>>("/api/accounts", TestContext.Current.CancellationToken))!);
    }

    [Fact]
    public async Task A_spread_transaction_keeps_its_months_through_an_export_and_an_import()
    {
        using var source = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: source);
        await RecordTransactionAsync(source, new
        {
            accountId = account,
            type = "expense",
            amount = "360.00",
            date = "2026-01-15",
            description = "Car insurance",
            spreadMonths = 12,
        });
        var export = await DownloadAsync(source);
        using var target = await CreateUserClientAsync();

        await ReadOkAsync<ImportDto>(await ImportAsync(target, WithNewIds(export)));
        var entries = (await target.GetFromJsonAsync<PageDto<SpreadEntryDto>>("/api/transactions", TestContext.Current.CancellationToken))!;

        var moved = Assert.Single(entries.Items);
        Assert.Equal((12, new DateOnly(2026, 12, 15)), (moved.SpreadMonths, moved.SpreadUntil));
    }

    [Fact]
    public async Task A_backward_spread_keeps_its_direction_and_first_month_through_an_export_and_an_import()
    {
        using var source = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: source);
        await RecordTransactionAsync(source, new
        {
            accountId = account,
            type = "expense",
            amount = "90.00",
            date = "2026-04-10",
            description = "Water",
            spreadMonths = 3,
            spreadDirection = "backward",
        });
        var export = await DownloadAsync(source);
        using var target = await CreateUserClientAsync();

        await ReadOkAsync<ImportDto>(await ImportAsync(target, WithNewIds(export)));
        var moved = Assert.Single((await target.GetFromJsonAsync<PageDto<SpreadEntryDto>>("/api/transactions", TestContext.Current.CancellationToken))!.Items);

        Assert.Equal((3, "backward", new DateOnly(2026, 2, 10), new DateOnly(2026, 4, 10)), (moved.SpreadMonths, moved.SpreadDirection, moved.SpreadFrom, moved.SpreadUntil));
    }

    [Fact]
    public async Task A_group_keeps_its_members_through_an_export_and_an_import_and_the_csv_names_it()
    {
        using var source = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: source);
        var hotel = await CreateTransactionAsync(source, account, null, "expense", "40.00", "2026-07-03", "Hotel");
        var bus = await CreateTransactionAsync(source, account, null, "expense", "12.00", "2026-07-04", "Bus");
        await CreateTransactionAsync(source, account, null, "expense", "5.00", "2026-07-05", "Coffee");
        await PostAsync<TransactionGroupDto>(source, "/api/transaction-groups", new { name = "Trip to Riga", transactionIds = new[] { hotel.Id, bus.Id } });
        var export = await DownloadAsync(source);
        string csv;
        string journal;
        using (var archive = new ZipArchive(new MemoryStream(export), ZipArchiveMode.Read))
        {
            csv = await new StreamReader(archive.GetEntry(UserExportService.TransactionsEntry)!.Open()).ReadToEndAsync(TestContext.Current.CancellationToken);
            journal = await new StreamReader(archive.GetEntry(UserExportService.JournalEntry)!.Open()).ReadToEndAsync(TestContext.Current.CancellationToken);
        }

        using var target = await CreateUserClientAsync();

        await ReadOkAsync<ImportDto>(await ImportAsync(target, WithNewIds(export)));
        var groups = (await target.GetFromJsonAsync<List<TransactionGroupDto>>("/api/transaction-groups", TestContext.Current.CancellationToken))!;
        var ledger = (await target.GetFromJsonAsync<PageDto<LedgerItemDto>>("/api/transactions/ledger", TestContext.Current.CancellationToken))!;

        var group = Assert.Single(groups);
        Assert.Equal(("Trip to Riga", 2), (group.Name, group.MemberCount));
        Assert.Equal(["transaction", "group"], ledger.Items.Select(item => item.Kind));
        var lines = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        Assert.EndsWith(",Place,Group", lines[0], StringComparison.Ordinal);
        Assert.Equal(2, lines.Count(line => line.EndsWith(",Trip to Riga", StringComparison.Ordinal)));
        Assert.DoesNotContain("Trip to Riga", journal, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_shared_group_on_the_members_account_comes_back_personal()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var hotel = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "40.00", "2026-07-03", "Hotel");
        var bus = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "12.00", "2026-07-04", "Bus");
        var dinner = await CreateTransactionAsync(pair.PartnerClient, shared, null, "expense", "30.00", "2026-07-05", "Dinner");
        await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/transaction-groups",
            new { name = "Trip to Riga", transactionIds = new[] { hotel.Id, bus.Id, dinner.Id }, scope = "shared", householdId = pair.HouseholdId });
        var export = await DownloadAsync(pair.OwnerClient);
        using var target = await CreateUserClientAsync();

        await ReadOkAsync<ImportDto>(await ImportAsync(target, WithNewIds(export)));
        var group = Assert.Single((await target.GetFromJsonAsync<List<SharedGroupDto>>("/api/transaction-groups", TestContext.Current.CancellationToken))!);

        Assert.Equal(("Trip to Riga", 3, "personal", (Guid?)null), (group.Name, group.MemberCount, group.Scope, group.HouseholdId));
    }

    [Fact]
    public async Task A_symbol_change_keeps_the_security_it_moves_to_through_an_export_and_an_import()
    {
        using var source = await CreateUserClientAsync();
        var broker = await CreateAccountAsync("5000.00", "investment", client: source);
        var old = await CreateSecurityAsync(source);
        var renamed = await CreateSecurityAsync(source);
        await RecordInvestmentAsync(source, new { accountId = broker, securityId = old, type = "buy", date = "2026-05-04", quantity = "10", price = "50" });
        await RecordInvestmentAsync(source, new { accountId = broker, type = "symbolChange", date = "2026-06-01", securityId = old, relatedSecurityId = renamed, quantity = "10" });
        var export = await DownloadAsync(source);
        using var target = await CreateUserClientAsync();

        await ReadOkAsync<ImportDto>(await ImportAsync(target, WithNewIds(export)));
        var entries = (await target.GetFromJsonAsync<PageDto<MovedEntryDto>>("/api/investments/transactions?pageSize=50", TestContext.Current.CancellationToken))!.Items;
        var change = Assert.Single(entries, e => e.Type == "symbolChange");
        var bought = Assert.Single(entries, e => e.Type == "buy");
        var holdings = (await target.GetFromJsonAsync<MovedPortfolioDto>("/api/investments/portfolio", TestContext.Current.CancellationToken))!.Holdings;

        Assert.Equal(bought.SecurityId, change.SecurityId);
        Assert.NotNull(change.RelatedSecurityId);
        Assert.NotEqual(change.SecurityId, change.RelatedSecurityId);
        Assert.Equal(("10", "500.00"), holdings.Where(h => h.Security.Id == change.RelatedSecurityId).Select(h => (h.Quantity, h.CostBasis)).Single());
    }

    [Fact]
    public async Task A_security_the_import_adds_arrives_without_a_price_source()
    {
        using var source = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", "investment", client: source);
        var symbol = NewSymbol();
        var coin = (await PostAsync<IdDto>(
            Client,
            "/api/investments/securities",
            new { symbol, name = "Fetched coin", type = "crypto", currency = "eur", priceSource = "kraken", priceSymbol = "XBTEUR" })).Id;
        await RecordInvestmentAsync(source, new { accountId = account, securityId = coin, type = "buy", date = "2026-06-01", quantity = "1", price = "100" });
        var export = await DownloadAsync(source);
        await WithDbAsync(db => db.Securities.Where(s => s.Id == new SecurityId(coin)).ExecuteUpdateAsync(
            s => s.SetProperty(x => x.IsDeleted, true),
            TestContext.Current.CancellationToken));
        using var target = await CreateUserClientAsync();

        await ReadOkAsync<ImportDto>(await ImportAsync(target, WithNewIds(export)));
        var added = await WithDbAsync(db => db.Securities.AsNoTracking().SingleAsync(s => s.Symbol == symbol, TestContext.Current.CancellationToken));

        Assert.NotEqual(coin, added.Id.Value);
        Assert.Equal((PriceSource.None, null), (added.PriceSource, added.PriceSymbol));
    }

    [Fact]
    public async Task Allocation_targets_by_security_follow_the_security_already_stored_here()
    {
        using var source = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", "investment", client: source);
        var fund = await CreateSecurityAsync(source);
        var other = await CreateSecurityAsync(source);
        await RecordInvestmentAsync(source, new { accountId = account, securityId = fund, type = "buy", date = "2026-06-01", quantity = "1", price = "100" });
        await RecordInvestmentAsync(source, new { accountId = account, securityId = other, type = "buy", date = "2026-06-01", quantity = "1", price = "100" });
        (await source.PutAsJsonAsync(
            "/api/investments/allocation-targets",
            new { dimension = "security", targets = new[] { new { key = fund.ToString(), share = "75" }, new { key = other.ToString(), share = "25" } } },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var export = await DownloadAsync(source);
        using var target = await CreateUserClientAsync();

        await ReadOkAsync<ImportDto>(await ImportAsync(target, WithNewIds(export)));
        var targets = (await target.GetFromJsonAsync<AllocationTargetsDto>("/api/investments/allocation-targets", TestContext.Current.CancellationToken))!;

        Assert.Equal("security", targets.Dimension);
        Assert.Equal([(fund.ToString(), "75"), (other.ToString(), "25")], targets.Targets.Select(t => (t.Key, t.Share)));
    }

    [Fact]
    public async Task People_with_their_splits_and_payments_travel_with_the_member()
    {
        using var source = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: source);
        var jonas = (await PostAsync<IdDto>(source, "/api/contacts", new { name = "Jonas" })).Id;
        var dinner = (await CreateTransactionAsync(source, account, null, "expense", "60.00", "2026-09-10", "Dinner")).Id;
        (await source.PostAsJsonAsync(
            "/api/contacts/splits",
            new { transactionId = dinner, method = "equal", own = new { }, shares = new[] { new { contactId = jonas } } },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await source.PostAsJsonAsync(
            $"/api/contacts/{jonas}/payments",
            new { direction = "fromContact", amount = "10.00", currency = "eur", date = "2026-09-12" },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var export = await DownloadAsync(source);
        using var target = await CreateUserClientAsync();

        await ReadOkAsync<ImportDto>(await ImportAsync(target, WithNewIds(export)));
        var people = (await target.GetFromJsonAsync<List<PersonDto>>("/api/contacts", TestContext.Current.CancellationToken))!;

        var person = Assert.Single(people);
        Assert.Equal("Jonas", person.Name);
        Assert.Equal([("eur", "20.00")], person.Balances.Select(b => (b.Currency, b.Amount)));
    }

    [Fact]
    public async Task A_debts_recorded_balances_travel_with_the_member()
    {
        using var source = await CreateUserClientAsync();
        var debt = (await PostAsync<IdDto>(source, "/api/debts", new { name = "Car loan", type = "loan", outstandingAmount = "1000.00", asOf = "2026-03-01" })).Id;
        (await source.PutAsJsonAsync($"/api/debts/{debt}/balances/2026-05-01", new { amount = "800.00", note = "Statement" }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        var export = await DownloadAsync(source);
        using var target = await CreateUserClientAsync();

        await ReadOkAsync<ImportDto>(await ImportAsync(target, WithNewIds(export)));
        var moved = Assert.Single((await target.GetFromJsonAsync<List<DebtDto>>("/api/debts", TestContext.Current.CancellationToken))!);
        var balances = (await target.GetFromJsonAsync<List<DebtBalanceDto>>($"/api/debts/{moved.Id}/balances", TestContext.Current.CancellationToken))!;

        Assert.Equal(("800.00", new DateOnly(2026, 5, 1)), (moved.OutstandingAmount, moved.AsOf));
        Assert.Equal(
            [new DebtBalanceDto(new DateOnly(2026, 5, 1), "800.00", "Statement"), new DebtBalanceDto(new DateOnly(2026, 3, 1), "1000.00", null)],
            balances);
    }

    private static async Task<byte[]> DownloadAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/users/me/export?attachments=true", TestContext.Current.CancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken);
    }

    private static async Task<HttpResponseMessage> ImportAsync(HttpClient client, byte[] zip)
    {
        using var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(zip);
        file.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
        content.Add(file, "file", "jx-finance-export.zip");
        return await client.PostAsync(ImportUrl, content, TestContext.Current.CancellationToken);
    }

    private static async Task UploadAttachmentAsync(HttpClient client, Guid transactionId, byte[] file)
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(file);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "receipt.pdf");
        (await client.PostAsync($"/api/transactions/{transactionId}/attachments", content, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
    }

    private static byte[] WithData(byte[] zip, Action<JsonObject> change)
    {
        using var output = new MemoryStream();
        using (var source = new ZipArchive(new MemoryStream(zip), ZipArchiveMode.Read))
        using (var target = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var entry in source.Entries)
            {
                using var reader = entry.Open();
                using var buffer = new MemoryStream();
                reader.CopyTo(buffer);
                var bytes = buffer.ToArray();
                if (entry.FullName == UserExportService.DataEntry)
                {
                    var document = JsonNode.Parse(bytes)!.AsObject();
                    change(document);
                    bytes = Encoding.UTF8.GetBytes(document.ToJsonString());
                }

                using var written = target.CreateEntry(entry.FullName).Open();
                written.Write(bytes);
            }
        }

        return output.ToArray();
    }

    private static JsonObject Table(JsonObject document, string name) =>
        document[BackupJsonNames.Tables]!.AsArray().Select(t => t!.AsObject()).Single(t => t[BackupJsonNames.Name]!.GetValue<string>() == name);

    private static void DropColumns(JsonObject document, string table, params string[] names)
    {
        var found = Table(document, table);
        var columns = found[BackupJsonNames.Columns]!.AsArray();
        var positions = names
            .Select(name => columns.Select(c => c!.GetValue<string>()).ToList().IndexOf(name))
            .Where(index => index >= 0)
            .OrderDescending()
            .ToList();
        Assert.Equal(names.Length, positions.Count);
        foreach (var index in positions)
        {
            columns.RemoveAt(index);
            foreach (var row in found[BackupJsonNames.Rows]!.AsArray())
            {
                row!.AsArray().RemoveAt(index);
            }
        }
    }

    private static byte[] WithNewIds(byte[] zip)
    {
        var ids = new Dictionary<Guid, Guid>();
        Guid Map(Guid id) => ids.TryGetValue(id, out var mapped) ? mapped : ids[id] = Guid.NewGuid();

        using var output = new MemoryStream();
        using (var source = new ZipArchive(new MemoryStream(zip), ZipArchiveMode.Read))
        using (var target = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var entry in source.Entries)
            {
                using var reader = entry.Open();
                using var buffer = new MemoryStream();
                reader.CopyTo(buffer);
                var name = entry.FullName;
                var bytes = buffer.ToArray();
                if (name == UserExportService.DataEntry)
                {
                    bytes = Encoding.UTF8.GetBytes(GuidPattern().Replace(Encoding.UTF8.GetString(bytes), m => Map(Guid.Parse(m.Value)).ToString()));
                }
                else if (name.StartsWith(BackupArchive.AttachmentFolder, StringComparison.Ordinal))
                {
                    name = BackupArchive.AttachmentEntry(Map(Guid.ParseExact(name[BackupArchive.AttachmentFolder.Length..], "N")));
                }

                using var written = target.CreateEntry(name).Open();
                written.Write(bytes);
            }
        }

        return output.ToArray();
    }

    [GeneratedRegex("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")]
    private static partial Regex GuidPattern();

    private sealed record ImportDto(int Tables, long Rows, int Attachments, int Removed);

    private sealed record NamedDto(Guid Id, string Name);

    private sealed record AttachmentDto(Guid Id);

    private sealed record EntryDto(Guid Id, List<Guid> TagIds);

    private sealed record SpreadEntryDto(Guid Id, int? SpreadMonths, DateOnly? SpreadUntil, string? SpreadDirection = null, DateOnly? SpreadFrom = null);

    private sealed record AllocationTargetDto(string Key, string Share);

    private sealed record AllocationTargetsDto(string? Dimension, List<AllocationTargetDto> Targets);

    private sealed record PersonBalanceDto(string Currency, string Amount);

    private sealed record PersonDto(string Name, List<PersonBalanceDto> Balances);

    private sealed record DebtDto(Guid Id, string OutstandingAmount, DateOnly AsOf);

    private sealed record SharedGroupDto(string Name, int MemberCount, string Scope, Guid? HouseholdId);

    private sealed record MovedEntryDto(string Type, Guid? SecurityId, Guid? RelatedSecurityId);

    private sealed record MovedSecurityDto(Guid Id);

    private sealed record MovedHoldingDto(MovedSecurityDto Security, string Quantity, string CostBasis);

    private sealed record MovedPortfolioDto(List<MovedHoldingDto> Holdings);

    private sealed record DebtBalanceDto(DateOnly Date, string Amount, string? Note);
}
