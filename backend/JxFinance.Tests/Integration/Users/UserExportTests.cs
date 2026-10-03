using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Investments;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Endpoints.Users.Services;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Users;

[Collection<IntegrationCollection>]
public sealed class UserExportTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string ExportUrl = "/api/users/me/export";

    [Fact]
    public async Task The_export_holds_what_the_member_owns_and_nothing_of_a_partner()
    {
        using var pair = await CreateHouseholdPairAsync();
        var owner = pair.OwnerClient;
        var partner = pair.PartnerClient;
        var personal = await CreateAccountAsync(client: owner);
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: owner);
        var archived = await CreateAccountAsync(client: owner);
        await CreateTransactionAsync(owner, archived, null, "expense", "1.00", "2026-06-01", "On the archived account");
        (await owner.DeleteAsync($"/api/accounts/{archived}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var partnerAccount = await CreateAccountAsync(householdId: pair.HouseholdId, client: partner);
        var partnerCategory = (await PostAsync<IdDto>(
            partner,
            "/api/categories",
            new { name = $"Shared {Guid.NewGuid():N}", type = "expense", scope = "shared", householdId = pair.HouseholdId })).Id;
        var partnerBudget = await Seed.BudgetAsync(partner, partnerCategory);
        var partnerGoal = await Seed.GoalAsync(partner);
        var ownGoal = await Seed.GoalAsync(owner);
        var ownTag = await CreateTagAsync(client: owner);
        var ownEntry = await RecordTransactionAsync(owner, new
        {
            accountId = personal,
            categoryId = partnerCategory,
            type = "expense",
            amount = "12.50",
            date = "2026-07-01",
            description = "=Groceries, weekly",
            tagIds = new[] { ownTag },
        });
        var partnerEntry = await CreateTransactionAsync(partner, shared, null, "expense", "40.00", "2026-07-02", "Partner on my account");
        var ownerOnPartner = await CreateTransactionAsync(owner, partnerAccount, null, "expense", "9.00", "2026-07-03", "Mine on the partner account");
        var transfer = await PostAsync<TransferDto>(
            owner,
            "/api/transfers",
            new { fromAccountId = personal, toAccountId = partnerAccount, amount = "30.00", date = "2026-07-04", description = "To partner" });

        using var export = await ExportAsync(owner);

        Assert.Equal(pair.Owner.Id, export.UserId);
        Assert.Equal(UserExportService.Format, export.Header.Format);
        Assert.Equal(0, export.MissingAttachments);
        Assert.Equal(new[] { personal, shared, archived }.Order(), export.Ids("Accounts").Order());
        Assert.Contains(ownEntry.Id, export.Ids("Transactions"));
        Assert.Contains(partnerEntry.Id, export.Ids("Transactions"));
        Assert.DoesNotContain(ownerOnPartner.Id, export.Ids("Transactions"));
        Assert.Contains(transfer.Id, export.Ids("Transfers"));
        Assert.Contains(partnerCategory, export.Ids("Categories"));
        Assert.Contains(ownTag, export.Ids("Tags"));
        Assert.Contains(ownGoal, export.Ids("Goals"));
        Assert.DoesNotContain(partnerGoal, export.Ids("Goals"));
        Assert.DoesNotContain(partnerBudget, export.Ids("Budgets"));
        Assert.All(export.Tables["Goals"].Rows, row => Assert.Equal(pair.Owner.Id.ToString(), row["UserId"]));
        var user = Assert.Single(export.Tables["AspNetUsers"].Rows);
        Assert.Equal(pair.Owner.Email, user["Email"]);
        Assert.DoesNotContain("PasswordHash", export.Tables["AspNetUsers"].Columns);
        Assert.False(export.Tables.ContainsKey("Households"));
        Assert.False(export.Tables.ContainsKey("HouseholdMemberships"));
        Assert.False(export.Tables.ContainsKey("AuditEvents"));

        var transactions = export.Csv(UserExportService.TransactionsEntry);
        Assert.Equal(TransactionCsvWriter.Header, transactions[0]);
        Assert.Contains(transactions, line => line.StartsWith("2026-07-01,\"'=Groceries, weekly\",", StringComparison.Ordinal));
        Assert.Contains(transactions, line => line.StartsWith("2026-07-02,Partner on my account,", StringComparison.Ordinal));
        Assert.DoesNotContain(transactions, line => line.Contains("Mine on the partner account", StringComparison.Ordinal));
        Assert.DoesNotContain(transactions, line => line.Contains("On the archived account", StringComparison.Ordinal));
        var transfers = export.Csv(UserExportService.TransfersEntry);
        Assert.Equal(UserExportService.TransfersHeader, transfers[0]);
        Assert.Single(transfers, line => line.StartsWith("2026-07-04,To partner,", StringComparison.Ordinal) && line.EndsWith(",30.00,EUR,30.00,EUR", StringComparison.Ordinal));
        var accounts = export.Csv(UserExportService.AccountsEntry);
        Assert.Equal(UserExportService.AccountsHeader, accounts[0]);
        Assert.Equal(3, accounts.Count - 1);
        Assert.Single(accounts, line => line.EndsWith(",Personal,true", StringComparison.Ordinal));
        Assert.Single(accounts, line => line.EndsWith(",Shared,false", StringComparison.Ordinal));
    }

    [Fact]
    public async Task The_member_row_carries_the_choice_to_count_open_balances()
    {
        using var member = await CreateUserClientAsync();
        (await member.PutAsJsonAsync("/api/networth/open-balances", new { count = true }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        using var export = await ExportAsync(member);

        Assert.Equal("true", Assert.Single(export.Tables["AspNetUsers"].Rows)["CountOpenBalancesInNetWorth"]);
    }

    [Fact]
    public async Task The_active_household_does_not_change_the_export()
    {
        using var pair = await CreateHouseholdPairAsync();
        var otherHousehold = await Seed.HouseholdAsync(pair.OwnerClient);
        var personal = await CreateAccountAsync(client: pair.OwnerClient);
        var elsewhere = await CreateAccountAsync(householdId: otherHousehold, client: pair.OwnerClient);
        await CreateTransactionAsync(pair.OwnerClient, personal, null, "income", "5.00", "2026-07-01", "Personal");
        await CreateTransactionAsync(pair.OwnerClient, elsewhere, null, "income", "6.00", "2026-07-02", "Elsewhere");

        using var everything = await ExportAsync(pair.OwnerClient);
        using var scoped = await ExportAsync(pair.OwnerClient, pair.HouseholdId);

        Assert.Contains(elsewhere, scoped.Ids("Accounts"));
        Assert.Equal(everything.Tables.Keys, scoped.Tables.Keys);
        foreach (var (name, table) in everything.Tables)
        {
            Assert.Equal(table.Rows.Select(Line).Order(), scoped.Tables[name].Rows.Select(Line).Order());
        }

        foreach (var entry in new[] { UserExportService.AccountsEntry, UserExportService.TransactionsEntry, UserExportService.TransfersEntry, UserExportService.JournalEntry })
        {
            Assert.Equal(everything.Csv(entry), scoped.Csv(entry));
        }
    }

    [Fact]
    public async Task A_partner_link_on_the_member_shared_debt_travels_with_the_debt()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var debt = (await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/debts",
            new { name = "Mortgage", type = "mortgage", outstandingAmount = "1000.00", asOf = "2026-05-01", tracksPayments = true, scope = "shared", householdId = pair.HouseholdId })).Id;
        var payment = await CreateTransactionAsync(pair.PartnerClient, account, null, "expense", "100.00", "2026-05-10", "Mortgage");
        (await pair.PartnerClient.PostAsJsonAsync($"/api/debts/{debt}/payments", new { transactionId = payment.Id }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        var link = Assert.Single((await pair.OwnerClient.GetFromJsonAsync<List<IdDto>>($"/api/debts/{debt}/payments", TestContext.Current.CancellationToken))!).Id;

        using var owners = await ExportAsync(pair.OwnerClient);
        using var partners = await ExportAsync(pair.PartnerClient);

        Assert.Contains(payment.Id, owners.Ids("Transactions"));
        Assert.Equal([link], owners.Ids("DebtPayments"));
        Assert.Equal(pair.Partner.Id.ToString(), Assert.Single(owners.Tables["DebtPayments"].Rows)["UserId"]);
        Assert.Empty(partners.Ids("DebtPayments"));
    }

    [Fact]
    public async Task Attached_files_come_only_when_asked_and_a_missing_one_is_counted()
    {
        var member = await CreateUserAsync();
        using var client = await LoginAsync(member);
        var account = await CreateAccountAsync(client: client);
        var transaction = await CreateTransactionAsync(client, account, null, "expense", "3.00", "2026-07-05");
        var receipt = Encoding.ASCII.GetBytes($"%PDF-1.7\n% kept {Guid.NewGuid():N}\n%%EOF");
        var kept = await UploadAttachmentAsync(client, transaction.Id, receipt);
        var lost = await UploadAttachmentAsync(client, transaction.Id, Encoding.ASCII.GetBytes($"%PDF-1.7\n% lost {Guid.NewGuid():N}\n%%EOF"));
        File.Delete(Path.Combine(Services.GetRequiredService<IConfiguration>()[ConfigKeys.AttachmentDirectory]!, lost.ToString("N")));

        using var without = await ExportAsync(client);
        using var with = await ExportAsync(client, attachments: true);

        Assert.DoesNotContain(without.Archive.Entries, e => e.FullName.StartsWith(BackupArchive.AttachmentFolder, StringComparison.Ordinal));
        Assert.Equal(0, without.MissingAttachments);
        Assert.Equal(1, with.MissingAttachments);
        Assert.Null(with.Archive.GetEntry(BackupArchive.AttachmentEntry(lost)));
        var file = with.Archive.GetEntry(BackupArchive.AttachmentEntry(kept))!;
        await using var content = await file.OpenAsync(TestContext.Current.CancellationToken);
        using var copy = new MemoryStream();
        await content.CopyToAsync(copy, TestContext.Current.CancellationToken);
        Assert.Equal(receipt, copy.ToArray());
        var row = Assert.Single(with.Tables["TransactionAttachments"].Rows, r => r["Id"] == kept.ToString());
        Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(copy.ToArray())), row["Sha256"]!.ToLowerInvariant());
    }

    [Fact]
    public async Task No_secret_of_the_member_reaches_the_file()
    {
        var member = await CreateUserAsync();
        using var client = await LoginAsync(member);
        var investment = await CreateAccountAsync(type: "investment", client: client);
        var markers = new[] { $"authenticator-{Guid.NewGuid():N}", $"broker-{Guid.NewGuid():N}", $"token-hash-{Guid.NewGuid():N}" };
        await WithDbAsync(async db =>
        {
            db.UserTokens.Add(new IdentityUserToken<Guid> { UserId = member.Id, LoginProvider = "[AspNetUserStore]", Name = "AuthenticatorKey", Value = markers[0] });
            db.BrokerConnections.Add(new BrokerConnection { UserId = member.Id, AccountId = new AccountId(investment), QueryId = "123456", ProtectedToken = markers[1] });
            db.PersonalApiTokens.Add(new PersonalApiToken
            {
                Id = Guid.NewGuid(),
                UserId = member.Id,
                Name = "Script",
                Prefix = "ABCDEFGH",
                SecretHash = markers[2],
                CreatedAt = DateTimeOffset.UtcNow,
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(30),
            });
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });
        var stored = await WithDbAsync(async db => new
        {
            User = await db.Users.AsNoTracking().SingleAsync(u => u.Id == member.Id, TestContext.Current.CancellationToken),
            Sessions = await db.UserSessions.Where(s => s.UserId == member.Id).Select(s => s.TokenHash).ToListAsync(TestContext.Current.CancellationToken),
        });

        using var export = await ExportAsync(client);

        var text = export.AllText();
        string[] secrets =
        [
            .. markers,
            stored.User.PasswordHash!,
            stored.User.SecurityStamp!,
            stored.User.ConcurrencyStamp!,
            member.Password,
            .. stored.Sessions,
        ];
        Assert.NotEmpty(stored.Sessions);
        Assert.All(secrets, secret => Assert.DoesNotContain(secret, text, StringComparison.Ordinal));
        Assert.Contains(investment.ToString(), export.Tables["BrokerConnections"].Rows.Select(r => r["AccountId"]));
        Assert.DoesNotContain("ProtectedToken", export.Tables["BrokerConnections"].Columns);
    }

    [Fact]
    public async Task A_security_travels_without_the_state_of_its_price_fetch()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", "investment", client: client);
        var coin = (await PostAsync<IdDto>(
            Client,
            "/api/investments/securities",
            new { symbol = NewSymbol(), name = "Fetched coin", type = "crypto", currency = "eur", priceSource = "kraken", priceSymbol = "XBTEUR" })).Id;
        await RecordInvestmentAsync(client, new { accountId = account, securityId = coin, type = "buy", date = "2026-06-01", quantity = "1", price = "100" });
        await WithDbAsync(db => db.Securities.Where(s => s.Id == new SecurityId(coin)).ExecuteUpdateAsync(
            s => s.SetProperty(x => x.PriceSyncError, "Kraken refused: busy").SetProperty(x => x.PriceSyncedAt, DateTimeOffset.UtcNow).SetProperty(x => x.PriceQuoteCurrency, "EUR"),
            TestContext.Current.CancellationToken));

        using var export = await ExportAsync(client);

        var securities = export.Tables["Securities"];
        Assert.DoesNotContain("PriceSyncError", securities.Columns);
        Assert.DoesNotContain("PriceSyncedAt", securities.Columns);
        Assert.DoesNotContain("PriceQuoteCurrency", securities.Columns);
        Assert.Equal("Kraken", Assert.Single(securities.Rows)["PriceSource"]);
    }

    [Fact]
    public async Task A_running_export_refuses_a_second_and_the_fourth_in_an_hour_is_throttled()
    {
        var member = await CreateUserAsync();
        using var client = await LoginAsync(member);

        await using (var scope = Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await using var held = await db.Database.BeginTransactionAsync(TestContext.Current.CancellationToken);
            Assert.True(await db.Database.TryLockAsync(AppLock.UserExport, member.Id, TestContext.Current.CancellationToken));

            await AssertProblemAsync(await client.GetAsync(ExportUrl, TestContext.Current.CancellationToken), HttpStatusCode.Conflict, "conflict.busy");
        }

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(ExportUrl, TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(ExportUrl, TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.GetAsync(ExportUrl, TestContext.Current.CancellationToken)).StatusCode);
    }

    private static string Line(IReadOnlyDictionary<string, string?> row) => string.Join('|', row.Values);

    private static async Task<Guid> UploadAttachmentAsync(HttpClient client, Guid transactionId, byte[] file)
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(file);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "receipt.pdf");
        var response = await client.PostAsync($"/api/transactions/{transactionId}/attachments", content, TestContext.Current.CancellationToken);
        return (await ReadOkAsync<IdDto>(response)).Id;
    }

    private static async Task<Export> ExportAsync(HttpClient client, Guid? household = null, bool attachments = false)
    {
        var response = await SendScopedAsync(client, HttpMethod.Get, attachments ? $"{ExportUrl}?attachments=true" : ExportUrl, household);
        var bytes = await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken);
        Assert.True(response.StatusCode == HttpStatusCode.OK, Encoding.UTF8.GetString(bytes));
        Assert.Equal("application/zip", response.Content.Headers.ContentType?.MediaType);
        Assert.Matches(@"^jx-finance-export-\d{4}-\d{2}-\d{2}\.zip$", response.Content.Headers.ContentDisposition?.FileName);

        var archive = new ZipArchive(new MemoryStream(bytes), ZipArchiveMode.Read);
        var visitor = new TableCollector();
        await using (var data = await archive.GetEntry(UserExportService.DataEntry)!.OpenAsync(TestContext.Current.CancellationToken))
        {
            await new BackupReader(visitor).ReadAsync(data, TestContext.Current.CancellationToken);
        }

        await using var head = await archive.GetEntry(UserExportService.DataEntry)!.OpenAsync(TestContext.Current.CancellationToken);
        using var document = await JsonDocument.ParseAsync(head, cancellationToken: TestContext.Current.CancellationToken);
        var root = document.RootElement;
        return new Export(
            archive,
            visitor.Header!,
            root.GetProperty(BackupJsonNames.UserId).GetGuid(),
            root.GetProperty(BackupJsonNames.MissingAttachments).GetInt32(),
            visitor.Tables);
    }

    private sealed record ExportedTable(IReadOnlyList<string> Columns, List<IReadOnlyDictionary<string, string?>> Rows);

    private sealed record Export(ZipArchive Archive, BackupHeader Header, Guid UserId, int MissingAttachments, Dictionary<string, ExportedTable> Tables) : IDisposable
    {
        public List<Guid> Ids(string table) =>
            Tables.TryGetValue(table, out var found) ? found.Rows.Select(r => Guid.Parse(r["Id"]!)).ToList() : [];

        public List<string> Csv(string entry)
        {
            using var reader = new StreamReader(Archive.GetEntry(entry)!.Open(), Encoding.UTF8);
            return reader.ReadToEnd().Split('\n', StringSplitOptions.RemoveEmptyEntries).Select(line => line.TrimEnd('\r')).ToList();
        }

        public string AllText()
        {
            var text = new StringBuilder();
            foreach (var entry in Archive.Entries)
            {
                using var reader = new StreamReader(entry.Open(), Encoding.UTF8);
                text.Append(reader.ReadToEnd());
            }

            return text.ToString();
        }

        public void Dispose() => Archive.Dispose();
    }

    private sealed class TableCollector : IBackupVisitor
    {
        private ExportedTable? current;

        public BackupHeader? Header { get; private set; }

        public Dictionary<string, ExportedTable> Tables { get; } = new(StringComparer.Ordinal);

        public Task BeginAsync(BackupHeader header, CancellationToken cancellationToken)
        {
            Header = header;
            return Task.CompletedTask;
        }

        public Task BeginTableAsync(string name, IReadOnlyList<string> columns, CancellationToken cancellationToken)
        {
            current = new ExportedTable(columns, []);
            Tables[name] = current;
            return Task.CompletedTask;
        }

        public Task RowAsync(IReadOnlyList<string?> row, CancellationToken cancellationToken)
        {
            current!.Rows.Add(current.Columns.Zip(row).ToDictionary(pair => pair.First, pair => pair.Second, StringComparer.Ordinal));
            return Task.CompletedTask;
        }

        public Task EndTableAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
