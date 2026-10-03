using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using JxFinance.Domain.Notifications;
using JxFinance.Endpoints.Backups.Services;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Infrastructure.Backups;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace JxFinance.Tests.Integration.Backups;

[Collection<DataCollection>]
public sealed class BackupEndpointTests(DataFixture fixture) : IntegrationTestBase(fixture), IDisposable
{
    private static readonly string[] DiscordKinds = ["billDue"];

    private HttpClient? admin;

    public void Dispose() => admin?.Dispose();

    [Fact]
    public async Task Restore_brings_back_the_data_of_the_backup_and_drops_what_came_after()
    {
        var member = await CreateUserAsync();
        var householdId = await CreateHouseholdAsync(member);
        var keptAccountId = await CreateAccountAsync(startingBalance: "123.45", householdId: householdId);
        var keptCategoryId = await CreateCategoryAsync();
        var backup = await CreateBackupAsync();
        var droppedAccountId = await CreateAccountAsync(startingBalance: "9.00");

        try
        {
            var response = await RestoreAsync(backup.Id, client: Client);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var restored = await response.Content.ReadFromJsonAsync<RestoredDto>(TestContext.Current.CancellationToken);
            Assert.Equal(backup.Rows, restored!.Rows);
            Assert.Equal(backup.Tables, restored.Tables);
            Assert.Equal(HttpStatusCode.Unauthorized, (await Client.GetAsync("/api/settings", TestContext.Current.CancellationToken)).StatusCode);
        }
        finally
        {
            await SignInAgainAsync();
        }

        Assert.Equal("123.45", await CurrentBalanceAsync(keptAccountId));
        Assert.Contains(keptCategoryId.ToString(), await Client.GetStringAsync("/api/categories", TestContext.Current.CancellationToken));
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync($"/api/accounts/{droppedAccountId}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Contains(await ListAsync(), b => b.Id == backup.Id);

        using var memberClient = await LoginAsync(member);
        Assert.Equal("123.45", await CurrentBalanceAsync(keptAccountId, memberClient));

        var afterRestore = await CreateUserAsync();
        Assert.NotEqual(Guid.Empty, afterRestore.Id);
    }

    [Fact]
    public async Task Restore_undoes_edits_and_deletions_made_after_the_backup()
    {
        var account = await CreateAccountAsync(startingBalance: "500.00");
        var category = await CreateCategoryAsync();
        var edited = await PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new { accountId = account, categoryId = category, type = "expense", amount = "42.10", date = "2026-06-05", description = "Before the backup" });
        var deleted = await PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new { accountId = account, type = "expense", amount = "7.90", date = "2026-06-06", description = "Deleted later" });
        var goal = await Seed.GoalAsync(Client, "Restored goal", "900.00", "100.00");
        var backup = await CreateBackupAsync();

        (await PutVersionedAsync(Client,
            $"/api/transactions/{edited.Id}",
            new { accountId = account, type = "expense", amount = "99.99", date = "2026-07-01", description = "After the backup" })).EnsureSuccessStatusCode();
        (await Client.DeleteAsync($"/api/transactions/{deleted.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await Client.DeleteAsync($"/api/categories/{category}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await Client.DeleteAsync($"/api/goals/{goal}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Equal("400.01", await CurrentBalanceAsync(account));

        try
        {
            Assert.Equal(HttpStatusCode.OK, (await RestoreAsync(backup.Id)).StatusCode);
        }
        finally
        {
            await SignInAgainAsync();
        }

        var restored = await Client.GetFromJsonAsync<RestoredTransactionDto>($"/api/transactions/{edited.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(new RestoredTransactionDto(edited.Id, category, "42.10", new DateOnly(2026, 6, 5), "Before the backup"), restored);
        Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync($"/api/transactions/{deleted.Id}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Contains(category.ToString(), await Client.GetStringAsync("/api/categories", TestContext.Current.CancellationToken));
        Assert.Contains(goal.ToString(), await Client.GetStringAsync("/api/goals", TestContext.Current.CancellationToken));
        Assert.Equal("450.00", await CurrentBalanceAsync(account));
    }

    [Fact]
    public async Task Restore_keeps_what_a_trash_entry_recorded_so_the_deletion_can_still_be_undone()
    {
        var account = await CreateAccountAsync(startingBalance: "10.00");
        var category = await CreateCategoryAsync();
        var transaction = await CreateTransactionAsync(Client, account, category, "expense", "4.20", "2026-06-07");
        (await Client.DeleteAsync($"/api/categories/{category}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var partner = await CreateUserAsync();
        var household = await CreateHouseholdAsync(partner);
        var me = await Client.GetFromJsonAsync<IdDto>("/api/auth/me", TestContext.Current.CancellationToken);
        var split = await PostAsync<IdDto>(
            Client,
            $"/api/households/{household}/shared-expenses",
            new { transactionId = transaction.Id, method = "equal", shares = new[] { new { userId = me!.Id }, new { userId = partner.Id } } });
        var payment = await PostAsync<IdDto>(
            Client,
            $"/api/households/{household}/settlements",
            new { fromUserId = partner.Id, toUserId = me.Id, amount = "1.00", currency = "eur", date = "2026-06-10" });
        (await Client.DeleteAsync($"/api/households/{household}/settlements/{payment.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var backup = await CreateBackupAsync();

        try
        {
            Assert.Equal(HttpStatusCode.OK, (await RestoreAsync(backup.Id)).StatusCode);
        }
        finally
        {
            await SignInAgainAsync();
        }

        var undo = await Client.PostAsJsonAsync("/api/trash/restore", new { kind = "category", entityId = category }, TestContext.Current.CancellationToken);
        var back = await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, undo.StatusCode);
        Assert.Equal(category, back!.CategoryId);

        var undoPayment = await Client.PostAsJsonAsync("/api/trash/restore", new { kind = "settlement", entityId = payment.Id }, TestContext.Current.CancellationToken);
        var splits = await Client.GetFromJsonAsync<PageDto<IdDto>>($"/api/households/{household}/shared-expenses", TestContext.Current.CancellationToken);
        var balances = await Client.GetStringAsync($"/api/households/{household}/settle-up", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, undoPayment.StatusCode);
        Assert.Equal([split.Id], splits!.Items.Select(s => s.Id));
        Assert.Contains("\"1.10\"", balances, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Restore_brings_back_the_audit_log_as_it_was_when_the_backup_was_taken()
    {
        var household = await CreateHouseholdAsync();
        var account = await CreateAccountAsync(startingBalance: "10.00", householdId: household);
        var backup = await CreateBackupAsync();
        await CreateTransactionAsync(Client, account, null, "expense", "1.00", "2026-06-08", "After the backup");

        try
        {
            Assert.Equal(HttpStatusCode.OK, (await RestoreAsync(backup.Id)).StatusCode);
        }
        finally
        {
            await SignInAgainAsync();
        }

        var log = await Client.GetFromJsonAsync<PageDto<AuditRowDto>>($"/api/households/{household}/audit", TestContext.Current.CancellationToken);

        Assert.Equal(["account", "household"], log!.Items.Select(e => e.EntityKind));
        Assert.All(log.Items, e => Assert.Equal("created", e.Action));
        Assert.Equal(account, log.Items[0].EntityId);
    }

    private sealed record AuditRowDto(string Action, string EntityKind, Guid? EntityId);

    private sealed record RestoredTransactionDto(Guid Id, Guid? CategoryId, string Amount, DateOnly Date, string? Description);

    [Fact]
    public async Task Restore_writes_the_attached_files_back_and_they_download_byte_for_byte()
    {
        var account = await CreateAccountAsync(startingBalance: "10.00");
        var transaction = await CreateTransactionAsync(Client, account, null, "expense", "3.10", "2026-06-09", "Receipt kept");
        var receipt = PdfBytes("kept");
        var kept = await UploadAttachmentAsync(transaction.Id, receipt, "kept.pdf");
        var trashed = await UploadAttachmentAsync(transaction.Id, PdfBytes("trashed"), "trashed.pdf");
        (await Client.DeleteAsync($"/api/attachments/{trashed.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var backup = await CreateBackupAsync();
        var later = await UploadAttachmentAsync(transaction.Id, PdfBytes("later"), "later.pdf");
        File.Delete(AttachmentPath(kept.Id));
        File.Delete(AttachmentPath(trashed.Id));

        RestoredDto restored;
        try
        {
            var response = await RestoreAsync(backup.Id);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            restored = (await response.Content.ReadFromJsonAsync<RestoredDto>(TestContext.Current.CancellationToken))!;
        }
        finally
        {
            await SignInAgainAsync();
        }

        var listed = await Client.GetFromJsonAsync<List<AttachmentRowDto>>($"/api/transactions/{transaction.Id}/attachments", TestContext.Current.CancellationToken);
        Assert.Equal([kept.Id], listed!.Select(a => a.Id));
        Assert.Equal(receipt, await Client.GetByteArrayAsync($"/api/attachments/{kept.Id}/content", TestContext.Current.CancellationToken));
        Assert.True(File.Exists(AttachmentPath(trashed.Id)));
        Assert.Equal(
            HttpStatusCode.NoContent,
            (await Client.PostAsJsonAsync("/api/trash/restore", new { kind = "attachment", entityId = trashed.Id }, TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync($"/api/attachments/{later.Id}/content", TestContext.Current.CancellationToken)).StatusCode);
        Assert.True(restored.Attachments >= 2);
        Assert.True(backup.Attachments >= 2);
    }

    [Fact]
    public async Task The_archive_holds_every_attached_file_under_its_id()
    {
        var account = await CreateAccountAsync(startingBalance: "10.00");
        var transaction = await CreateTransactionAsync(Client, account, null, "expense", "1.10", "2026-06-10");
        var receipt = PdfBytes("in the archive");
        var attachment = await UploadAttachmentAsync(transaction.Id, receipt, "archived.pdf");

        using var archive = new ZipArchive(new MemoryStream(await DownloadAsync((await CreateBackupAsync()).Id)), ZipArchiveMode.Read);
        var entry = archive.GetEntry($"attachments/{attachment.Id:N}");

        Assert.NotNull(entry);
        await using var content = entry.Open();
        using var copy = new MemoryStream();
        await content.CopyToAsync(copy, TestContext.Current.CancellationToken);
        Assert.Equal(receipt, copy.ToArray());
        Assert.All(archive.Entries, e => Assert.True(e.FullName == "backup.json" || e.FullName.StartsWith("attachments/", StringComparison.Ordinal)));
    }

    [Fact]
    public async Task An_archive_with_a_file_that_does_not_match_its_checksum_is_rolled_back()
    {
        var account = await CreateAccountAsync(startingBalance: "10.00");
        var transaction = await CreateTransactionAsync(Client, account, null, "expense", "2.10", "2026-06-11");
        var attachment = await UploadAttachmentAsync(transaction.Id, PdfBytes("original"), "original.pdf");
        var file = await DownloadAsync((await CreateBackupAsync()).Id);
        using var tampered = new MemoryStream();
        tampered.Write(file);
        using (var archive = new ZipArchive(tampered, ZipArchiveMode.Update, leaveOpen: true))
        {
            archive.GetEntry($"attachments/{attachment.Id:N}")!.Delete();
            await using var replaced = archive.CreateEntry($"attachments/{attachment.Id:N}").Open();
            await replaced.WriteAsync(PdfBytes("forged"), TestContext.Current.CancellationToken);
        }

        var uploaded = await UploadAsync(tampered.ToArray());
        Assert.Equal(HttpStatusCode.Created, uploaded.StatusCode);
        var stored = (await uploaded.Content.ReadFromJsonAsync<BackupDto>(TestContext.Current.CancellationToken))!;
        var afterwards = await CreateAccountAsync(startingBalance: "7.00");

        var response = await RestoreAsync(stored.Id);

        await AssertRejectedAsync(response, "backup.invalidFile");
        Assert.Equal("7.00", await CurrentBalanceAsync(afterwards));
    }

    [Fact]
    public async Task An_archive_with_an_unexpected_entry_is_not_stored()
    {
        var file = await DownloadAsync((await CreateBackupAsync()).Id);
        using var altered = new MemoryStream();
        altered.Write(file);
        using (var archive = new ZipArchive(altered, ZipArchiveMode.Update, leaveOpen: true))
        {
            await using var extra = archive.CreateEntry("../outside.txt").Open();
            await extra.WriteAsync(Encoding.UTF8.GetBytes("nope"), TestContext.Current.CancellationToken);
        }

        await AssertRejectedAsync(await UploadAsync(altered.ToArray()), "backup.invalidFile");
    }

    private static byte[] PdfBytes(string text) => Encoding.ASCII.GetBytes($"%PDF-1.7\n% {text} {Guid.NewGuid():N}\n%%EOF");

    private string AttachmentPath(Guid id) =>
        Path.Combine(Services.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>()[ConfigKeys.AttachmentDirectory]!, id.ToString("N"));

    private async Task<AttachmentRowDto> UploadAttachmentAsync(Guid transactionId, byte[] file, string name)
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(file);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", name);
        var response = await Client.PostAsync($"/api/transactions/{transactionId}/attachments", content);
        Assert.True(response.StatusCode == HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<AttachmentRowDto>())!;
    }

    [Fact]
    public async Task Restore_brings_back_the_price_history_of_a_security()
    {
        var security = await CreateSecurityAsync(Client);
        await SetPriceAsync(security, "10", "2026-06-01");
        await SetPriceAsync(security, "12", "2026-06-08");
        var backup = await CreateBackupAsync();
        await SetPriceAsync(security, "99", "2026-06-15");
        (await Client.DeleteAsync($"/api/investments/securities/{security}/prices/2026-06-01", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        try
        {
            Assert.Equal(HttpStatusCode.OK, (await RestoreAsync(backup.Id)).StatusCode);
        }
        finally
        {
            await SignInAgainAsync();
        }

        var points = await Client.GetFromJsonAsync<List<RestoredPriceDto>>($"/api/investments/securities/{security}/prices", TestContext.Current.CancellationToken);
        Assert.Equal(
            [new RestoredPriceDto(new DateOnly(2026, 6, 8), "12"), new RestoredPriceDto(new DateOnly(2026, 6, 1), "10")],
            points);
    }

    [Fact]
    public async Task Restore_brings_back_the_repayment_terms_and_payments_of_a_debt_and_the_valuations_of_an_asset()
    {
        var debt = await PostAsync<RestoredDebtDto>(
            Client,
            "/api/debts",
            new { name = "Mortgage", type = "mortgage", outstandingAmount = "99000.00", interestRate = 5m, asOf = Today.AddDays(-5), loanAmount = "100000.00", firstPaymentDate = "2026-01-01", termMonths = 360, amortizationType = "linear", tracksPayments = true });
        var paid = await CreateTransactionAsync(Client, await CreateAccountAsync(), null, "expense", "600.00", $"{Today:yyyy-MM-dd}");
        var payments = $"/api/debts/{debt.Id}/payments";
        (await Client.PostAsJsonAsync(payments, new { transactionId = paid.Id }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var link = Assert.Single((await Client.GetFromJsonAsync<List<IdDto>>(payments, TestContext.Current.CancellationToken))!);
        var depreciation = new RestoredDepreciationDto(Today.AddDays(-10), "12000.00", 96, "1500.00");
        var asset = await PostAsync<IdDto>(
            Client,
            "/api/assets",
            new { name = "Car", type = "vehicle", currentValue = "12000.00", asOf = Today.AddDays(-10), depreciation });
        var valuationUrl = $"/api/assets/{asset.Id}/valuations/{Today.AddDays(-5):yyyy-MM-dd}";
        (await Client.PutAsJsonAsync(valuationUrl, new { value = "11000.00", note = "Inspection" }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var backup = await CreateBackupAsync();
        (await Client.PutAsJsonAsync(
            $"/api/debts/{debt.Id}",
            new { name = "Mortgage", type = "mortgage", outstandingAmount = "99000.00", asOf = Today, monthlyPayment = "10.00" }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await Client.DeleteAsync($"{payments}/{link.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await Client.PutAsJsonAsync(
            $"/api/assets/{asset.Id}",
            new { name = "Car", type = "vehicle", currentValue = "12000.00", asOf = Today.AddDays(-10) }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await Client.DeleteAsync(valuationUrl, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        try
        {
            Assert.Equal(HttpStatusCode.OK, (await RestoreAsync(backup.Id)).StatusCode);
        }
        finally
        {
            await SignInAgainAsync();
        }

        var restored = Assert.Single((await Client.GetFromJsonAsync<List<RestoredDebtDto>>("/api/debts", TestContext.Current.CancellationToken))!, d => d.Id == debt.Id);
        Assert.Equal(debt with { TrackedBalance = "98812.50" }, restored);
        Assert.Equal(link, Assert.Single((await Client.GetFromJsonAsync<List<IdDto>>(payments, TestContext.Current.CancellationToken))!));
        Assert.Equal(
            [new RestoredBalanceDto(Today.AddDays(-5), "99000.00")],
            await Client.GetFromJsonAsync<List<RestoredBalanceDto>>($"/api/debts/{debt.Id}/balances", TestContext.Current.CancellationToken));
        Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync($"/api/debts/{debt.Id}/schedule", TestContext.Current.CancellationToken)).StatusCode);
        var restoredAsset = Assert.Single((await Client.GetFromJsonAsync<List<RestoredAssetDto>>("/api/assets", TestContext.Current.CancellationToken))!, a => a.Id == asset.Id);
        Assert.Equal(new RestoredAssetDto(asset.Id, "11000.00", depreciation), restoredAsset);
        Assert.Equal(
            [new RestoredValuationDto(Today.AddDays(-5), "11000.00"), new RestoredValuationDto(Today.AddDays(-10), "12000.00")],
            await Client.GetFromJsonAsync<List<RestoredValuationDto>>($"/api/assets/{asset.Id}/valuations", TestContext.Current.CancellationToken));
    }

    private sealed record RestoredValuationDto(DateOnly Date, string Value);

    private sealed record RestoredBalanceDto(DateOnly Date, string Amount);

    private sealed record RestoredAssetDto(Guid Id, string CurrentValue, RestoredDepreciationDto? Depreciation);

    private sealed record RestoredDepreciationDto(DateOnly StartDate, string StartValue, int LifeMonths, string ResidualValue);

    [Fact]
    public async Task Restore_brings_back_the_dashboard_layout_and_the_passkeys_of_each_user()
    {
        const string layoutUrl = "/api/users/me/dashboard-layout";
        var member = await CreateUserAsync();
        using var memberClient = await LoginAsync(member);
        using var authenticator = new SoftwareAuthenticator();
        Assert.Equal(HttpStatusCode.Created, (await authenticator.RegisterAsync(memberClient, member.Password)).StatusCode);
        (await memberClient.PutAsJsonAsync(layoutUrl, new RestoredLayoutDto(["upcomingBills", "summary"], ["netWorth"], false), TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        var backup = await CreateBackupAsync();
        (await memberClient.DeleteAsync(layoutUrl, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await memberClient.DeleteAsync($"/api/auth/passkeys/{authenticator.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        try
        {
            Assert.Equal(HttpStatusCode.OK, (await RestoreAsync(backup.Id)).StatusCode);
        }
        finally
        {
            await SignInAgainAsync();
        }

        using var restoredClient = await LoginAsync(member);
        var layout = await restoredClient.GetFromJsonAsync<RestoredLayoutDto>(layoutUrl, TestContext.Current.CancellationToken);
        Assert.False(layout!.IsDefault);
        Assert.Equal(["upcomingBills", "summary"], layout.Order.Take(2));
        Assert.Equal(["netWorth"], layout.Hidden);
        using var passkeyClient = CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await authenticator.SignInAsync(passkeyClient)).StatusCode);
    }

    [Fact]
    public async Task Restore_ends_every_api_token_even_one_an_older_backup_still_carries()
    {
        var member = await CreateUserAsync();
        await IssueTokenAsync(member.Id);
        var carried = await WithDbAsync(async db =>
        {
            var shape = BackupDatabase.ReadShapes(db).Single(t => t.Name == "PersonalApiTokens");
            await db.Database.OpenConnectionAsync(TestContext.Current.CancellationToken);
            using var buffer = new MemoryStream();
            await using (var json = new Utf8JsonWriter(buffer))
            {
                await BackupDatabase.WriteTableAsync(
                    (NpgsqlConnection)db.Database.GetDbConnection(), shape, json, null, [], TestContext.Current.CancellationToken);
            }

            return JsonNode.Parse(buffer.ToArray())!;
        });
        var document = Unzip(await DownloadAsync((await CreateBackupAsync()).Id));
        document[BackupJsonNames.Tables]!.AsArray().Add(carried);
        var older = await StoreAsync(document);

        try
        {
            Assert.Equal(HttpStatusCode.OK, (await RestoreAsync(older.Id)).StatusCode);
        }
        finally
        {
            await SignInAgainAsync();
        }

        Assert.Equal(0, await WithDbAsync(db => db.PersonalApiTokens.CountAsync(t => t.UserId == member.Id, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Restore_keeps_the_discord_channel_month_closes_and_reconciliations_and_drops_queued_discord_messages()
    {
        const string discordUrl = "/api/settings/discord";
        const string kindsUrl = "/api/users/me/discord-notifications";
        const string closeUrl = "/api/month-close/2025-05";
        var administrator = await CreateUserAsync("Admin");
        using var adminClient = await LoginAsync(administrator);
        var member = await CreateUserAsync();
        using var memberClient = await LoginAsync(member);
        (await adminClient.PutAsJsonAsync(
            discordUrl,
            new { enabled = false, webhookUrl = "https://discord.com/api/webhooks/77/restore-token" },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await memberClient.PutAsJsonAsync(kindsUrl, new { types = DiscordKinds }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        await WithDbAsync(async db =>
        {
            db.DiscordMessages.Add(new DiscordMessage
            {
                UserId = member.Id,
                NotificationType = NotificationType.BillDue,
                Content = "queued before the backup",
                CreatedAt = DateTimeOffset.UtcNow,
                NextAttemptAt = DateTimeOffset.UtcNow.AddHours(1),
            });
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });
        var account = await CreateAccountAsync("100.00", client: memberClient);
        await CreateTransactionAsync(memberClient, account, null, "expense", "12.00", "2025-05-03");
        (await memberClient.PostAsJsonAsync(closeUrl, new { note = "Kept" }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var reconciliation = await PostAsync<ReconciliationDto>(
            memberClient,
            $"/api/accounts/{account}/reconciliations",
            new { date = "2025-05-31", balance = "90.00" });
        var backup = await CreateBackupAsync();
        (await adminClient.PutAsJsonAsync(
            discordUrl,
            new { enabled = false, webhookUrl = "https://discord.com/api/webhooks/78/after-backup" },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await memberClient.PutAsJsonAsync(kindsUrl, new { types = Array.Empty<string>() }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await memberClient.DeleteAsync(closeUrl, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await memberClient.DeleteAsync($"/api/accounts/{account}/reconciliations/{reconciliation.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        try
        {
            Assert.Equal(HttpStatusCode.OK, (await RestoreAsync(backup.Id)).StatusCode);
        }
        finally
        {
            await SignInAgainAsync();
        }

        using var restoredClient = await LoginAsync(member);
        using var restoredAdmin = await LoginAsync(administrator);
        var discord = await restoredAdmin.GetFromJsonAsync<JsonObject>(discordUrl, TestContext.Current.CancellationToken);
        Assert.True(discord!["hasWebhook"]!.GetValue<bool>());
        Assert.False(discord["unreadable"]!.GetValue<bool>());
        (await restoredAdmin.PostAsync($"{discordUrl}/test", null, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Single(Services.GetRequiredService<FakeDiscordWebhookClient>().To("77"));
        var me = await restoredClient.GetFromJsonAsync<JsonObject>("/api/auth/me", TestContext.Current.CancellationToken);
        Assert.Equal(DiscordKinds, me!["discordNotificationTypes"]!.AsArray().Select(t => t!.GetValue<string>()));
        Assert.Equal(0, await WithDbAsync(db => db.DiscordMessages.CountAsync(m => m.UserId == member.Id, TestContext.Current.CancellationToken)));
        var review = await restoredClient.GetFromJsonAsync<JsonObject>(closeUrl, TestContext.Current.CancellationToken);
        Assert.Equal("closed", review!["status"]!.GetValue<string>());
        Assert.Equal("Kept", review["note"]!.GetValue<string>());
        Assert.Equal("12.00", review["drift"]!["totals"]!["closedExpense"]!.GetValue<string>());
        var reconciled = await restoredClient.GetFromJsonAsync<List<ReconciliationDto>>(
            $"/api/accounts/{account}/reconciliations",
            TestContext.Current.CancellationToken);
        var restored = Assert.Single(reconciled!);
        Assert.Equal((reconciliation.Id, "90.00", "2.00"), (restored.Id, restored.Balance, restored.Difference));
    }

    private sealed record RestoredLayoutDto(List<string> Order, List<string> Hidden, bool IsDefault);

    private sealed record RestoredDebtDto(
        Guid Id,
        string LoanAmount,
        DateOnly? FirstPaymentDate,
        int? TermMonths,
        string? MonthlyPayment,
        string AmortizationType,
        DateOnly? PayoffDate,
        string? TrackedBalance);

    private async Task SetPriceAsync(Guid securityId, string lastPrice, string lastPriceDate) =>
        (await Client.PutAsJsonAsync($"/api/investments/securities/{securityId}/price", new { lastPrice, lastPriceDate })).EnsureSuccessStatusCode();

    private sealed record RestoredPriceDto(DateOnly Date, string Price);

    [Fact]
    public async Task Created_backup_is_listed_newest_first_with_its_size_and_note()
    {
        var older = await CreateBackupAsync("before the import");
        var newer = await CreateBackupAsync();

        var backups = await ListAsync();

        Assert.True(backups.FindIndex(b => b.Id == newer.Id) < backups.FindIndex(b => b.Id == older.Id));
        var listed = backups.Single(b => b.Id == older.Id);
        Assert.Equal("before the import", listed.Note);
        Assert.True(listed.SizeBytes > 0);
        Assert.True(listed.Rows > 0);
        Assert.True(listed.Restorable);
        Assert.False(listed.Uploaded);
    }

    [Fact]
    public async Task Note_can_be_changed_and_removed()
    {
        var backup = await CreateBackupAsync("first");

        var renamed = await PutAsync(backup.Id, "second");
        var cleared = await PutAsync(backup.Id, "  ");

        Assert.Equal("second", renamed.Note);
        Assert.Null(cleared.Note);
        Assert.Null((await ListAsync()).Single(b => b.Id == backup.Id).Note);
    }

    [Fact]
    public async Task Note_longer_than_200_characters_is_rejected()
    {
        var response = await Client.PostAsJsonAsync("/api/backups", new { note = new string('x', 201) }, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "note");
    }

    [Fact]
    public async Task Deleted_backup_is_gone()
    {
        var backup = await CreateBackupAsync();

        var deleted = await Client.DeleteAsync($"/api/backups/{backup.Id}", TestContext.Current.CancellationToken);
        var again = await Client.DeleteAsync($"/api/backups/{backup.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);
        Assert.DoesNotContain(await ListAsync(), b => b.Id == backup.Id);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync($"/api/backups/{backup.Id}/download", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await RestoreAsync(backup.Id)).StatusCode);
    }

    [Fact]
    public async Task Download_is_a_zip_archive_without_sessions_or_api_tokens()
    {
        var backup = await CreateBackupAsync();

        var response = await Client.GetAsync($"/api/backups/{backup.Id}/download", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/zip", response.Content.Headers.ContentType?.MediaType);
        Assert.EndsWith(".zip", response.Content.Headers.ContentDisposition?.FileName?.Trim('"'));
        var file = await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken);
        Assert.Equal(backup.SizeBytes, file.Length);

        var document = Unzip(file);
        Assert.Equal(BackupService.Format, document[BackupJsonNames.Format]!.GetValue<string>());
        var tables = document[BackupJsonNames.Tables]!.AsArray().Select(t => t![BackupJsonNames.Name]!.GetValue<string>()).ToList();
        Assert.Contains("Accounts", tables);
        Assert.Contains("AspNetUsers", tables);
        Assert.Contains("DeletionEntries", tables);
        Assert.Contains("DeletionChanges", tables);
        Assert.Contains("AuditEvents", tables);
        Assert.Contains("TransactionAttachments", tables);
        Assert.Contains("ReceiptReadings", tables);
        Assert.Contains("ReceiptItemCategories", tables);
        Assert.Contains("AspNetUserPasskeys", tables);
        Assert.Contains("SharedExpenses", tables);
        Assert.Contains("SharedExpenseShares", tables);
        Assert.Contains("Settlements", tables);
        Assert.DoesNotContain("UserSessions", tables);
        Assert.DoesNotContain("PersonalApiTokens", tables);
        Assert.DoesNotContain("ApiIdempotencyKeys", tables);
        Assert.DoesNotContain("EmailMessages", tables);
    }

    [Fact]
    public async Task Downloaded_backup_can_be_uploaded_again()
    {
        var original = await CreateBackupAsync();
        var file = await DownloadAsync(original.Id);

        var response = await UploadAsync(file, note: "from the old server");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var uploaded = await response.Content.ReadFromJsonAsync<BackupDto>(TestContext.Current.CancellationToken);
        Assert.NotEqual(original.Id, uploaded!.Id);
        Assert.True(uploaded.Uploaded);
        Assert.True(uploaded.Restorable);
        Assert.Equal(original.Rows, uploaded.Rows);
        Assert.Equal(original.CreatedAt, uploaded.CreatedAt);
        Assert.Equal("from the old server", uploaded.Note);
    }

    [Fact]
    public async Task File_that_is_not_a_backup_is_not_stored()
    {
        var before = (await ListAsync()).Count;

        var response = await UploadAsync(Encoding.UTF8.GetBytes("{\"format\":\"something-else\"}"));

        await AssertRejectedAsync(response, "backup.invalidFile");
        Assert.Equal(before, (await ListAsync()).Count);
    }

    [Fact]
    public async Task Backup_with_rows_the_database_rejects_is_rolled_back()
    {
        var accountId = await CreateAccountAsync(startingBalance: "10.00");
        var document = Unzip(await DownloadAsync((await CreateBackupAsync()).Id));
        var accounts = document[BackupJsonNames.Tables]!.AsArray().Single(t => t![BackupJsonNames.Name]!.GetValue<string>() == "Accounts")!;
        var userColumn = accounts[BackupJsonNames.Columns]!.AsArray().Select(c => c!.GetValue<string>()).ToList().IndexOf("UserId");
        accounts[BackupJsonNames.Rows]![0]![userColumn] = Guid.NewGuid().ToString();
        var damaged = await StoreAsync(document);

        var response = await RestoreAsync(damaged.Id);

        await AssertRejectedAsync(response, "backup.invalidFile");
        Assert.Equal("10.00", await CurrentBalanceAsync(accountId));
    }

    [Fact]
    public async Task Backup_from_another_database_version_is_listed_but_not_restorable()
    {
        var document = Unzip(await DownloadAsync((await CreateBackupAsync()).Id));
        document[BackupJsonNames.Migration] = "20000101000000_Older";

        var older = await StoreAsync(document);
        var response = await RestoreAsync(older.Id);

        Assert.False(older.Restorable);
        await AssertRejectedAsync(response, "backup.schemaMismatch");
    }

    [Fact]
    public async Task Members_cannot_touch_backups()
    {
        var backup = await CreateBackupAsync();
        using var member = await CreateUserClientAsync();

        HttpResponseMessage[] responses =
        [
            await member.GetAsync("/api/backups", TestContext.Current.CancellationToken),
            await member.PostAsJsonAsync("/api/backups", new { note = (string?)null }, TestContext.Current.CancellationToken),
            await UploadAsync([1, 2, 3], member),
            await member.PutAsJsonAsync($"/api/backups/{backup.Id}", new { note = "mine" }, TestContext.Current.CancellationToken),
            await member.GetAsync($"/api/backups/{backup.Id}/download", TestContext.Current.CancellationToken),
            await RestoreAsync(backup.Id, client: member),
            await member.DeleteAsync($"/api/backups/{backup.Id}", TestContext.Current.CancellationToken),
        ];

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode));
    }

    [Fact]
    public async Task Restore_requires_the_current_password_of_the_administrator()
    {
        var accountId = await CreateAccountAsync(startingBalance: "10.00");
        var backup = await CreateBackupAsync();
        using var second = await CreateUserClientAsync("Admin");

        var missing = await second.PostAsJsonAsync($"/api/backups/{backup.Id}/restore", new { }, TestContext.Current.CancellationToken);
        var wrong = await RestoreAsync(backup.Id, "Wrong-Password-123!", second);

        await AssertValidationErrorAsync(missing, "password");
        await AssertRejectedAsync(wrong, "password.incorrect");
        Assert.Equal(HttpStatusCode.OK, (await second.GetAsync("/api/auth/me", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal("10.00", await CurrentBalanceAsync(accountId));
    }

    [Fact]
    public async Task Wrong_restore_passwords_lock_the_administrator_out()
    {
        var backup = await CreateBackupAsync();
        var administrator = await CreateUserAsync("Admin");
        using var client = await LoginAsync(administrator);

        for (var attempt = 1; attempt <= 4; attempt++)
        {
            await AssertRejectedAsync(await RestoreAsync(backup.Id, "Wrong-Password-123!", client), "password.incorrect");
        }

        var locked = await RestoreAsync(backup.Id, "Wrong-Password-123!", client);

        Assert.Equal(HttpStatusCode.TooManyRequests, locked.StatusCode);
        Assert.Contains("credentials.lockedOut", await locked.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Restore_is_rate_limited_per_client()
    {
        using var client = await CreateUserClientAsync("Admin");
        var password = "Test-User-Password-123!";

        for (var attempt = 1; attempt <= 5; attempt++)
        {
            Assert.Equal(HttpStatusCode.NotFound, (await RestoreAsync(Guid.NewGuid(), password, client)).StatusCode);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, (await RestoreAsync(Guid.NewGuid(), password, client)).StatusCode);
    }

    [Fact]
    public async Task Taking_and_uploading_backups_is_rate_limited_per_client()
    {
        using var client = await CreateUserClientAsync("Admin");

        for (var attempt = 1; attempt <= 10; attempt++)
        {
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/backups", new { note = new string('x', 201) }, TestContext.Current.CancellationToken)).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, (await UploadAsync([1, 2, 3], client)).StatusCode);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.PostAsJsonAsync("/api/backups", new { note = "one too many" }, TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await UploadAsync([1, 2, 3], client)).StatusCode);
    }

    [Fact]
    public async Task Upload_that_decompresses_beyond_the_limit_is_refused_and_not_stored()
    {
        var before = (await ListAsync()).Count;

        var response = await UploadAsync(await OversizedBackupAsync("20000101000000_Any"));

        await AssertRejectedAsync(response, "backup.tooLarge");
        Assert.Equal(before, (await ListAsync()).Count);
    }

    [Fact]
    public async Task Stored_backup_that_decompresses_beyond_the_limit_is_not_restored()
    {
        var accountId = await CreateAccountAsync(startingBalance: "10.00");
        var migration = Unzip(await DownloadAsync((await CreateBackupAsync()).Id))[BackupJsonNames.Migration]!.GetValue<string>();
        var file = await OversizedBackupAsync(migration);
        var id = Guid.NewGuid();
        await Services.GetRequiredService<BackupStore>().AddAsync(
            id,
            async stream =>
            {
                await stream.WriteAsync(file, TestContext.Current.CancellationToken);
                return new StoredBackup(id, DateTimeOffset.UtcNow, null, "", 1, 1, Uploaded: true);
            },
            TestContext.Current.CancellationToken);

        var response = await RestoreAsync(id);

        await AssertRejectedAsync(response, "backup.tooLarge");
        Assert.Equal("10.00", await CurrentBalanceAsync(accountId));
        (await Client.DeleteAsync($"/api/backups/{id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Restore_answers_a_retryable_conflict_when_the_database_is_locked()
    {
        var accountId = await CreateAccountAsync(startingBalance: "10.00");
        var backup = await CreateBackupAsync();
        await using var blocker = new NpgsqlConnection(ConnectionString);
        await blocker.OpenAsync(TestContext.Current.CancellationToken);
        await using var transaction = await blocker.BeginTransactionAsync(TestContext.Current.CancellationToken);
        await using (var hold = new NpgsqlCommand("LOCK TABLE \"Accounts\" IN ACCESS EXCLUSIVE MODE", blocker, transaction))
        {
            await hold.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
        }

        var response = await RestoreAsync(backup.Id);
        await transaction.RollbackAsync(TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("conflict.busy", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        Assert.Equal("10.00", await CurrentBalanceAsync(accountId));
    }

    private static async Task<byte[]> OversizedBackupAsync(string migration)
    {
        using var file = new MemoryStream();
        await using (var gzip = new GZipStream(file, CompressionLevel.Fastest, leaveOpen: true))
        {
            await gzip.WriteAsync(Encoding.UTF8.GetBytes(
                $"{{\"{BackupJsonNames.Format}\":\"{BackupService.Format}\",\"{BackupJsonNames.Version}\":1,"
                + $"\"{BackupJsonNames.CreatedAt}\":\"2026-09-19T00:00:00+00:00\",\"{BackupJsonNames.Migration}\":\"{migration}\",\"{BackupJsonNames.Tables}\":["));
            var padding = Encoding.UTF8.GetBytes(new string(' ', 1024 * 1024));
            for (long written = 0; written <= ApiFixture.BackupMaxDecompressedBytes; written += padding.Length)
            {
                await gzip.WriteAsync(padding);
            }

            await gzip.WriteAsync(Encoding.UTF8.GetBytes("]}"));
        }

        return file.ToArray();
    }

    private async Task<HttpClient> AdminAsync() =>
        admin ??= await LoginAsync(new TestUser(Guid.Empty, ApiFixture.TestAdminEmail, ApiFixture.TestAdminPassword));

    private async Task<HttpResponseMessage> RestoreAsync(Guid id, string password = ApiFixture.TestAdminPassword, HttpClient? client = null) =>
        await (client ?? await AdminAsync()).PostAsJsonAsync($"/api/backups/{id}/restore", new { password });

    private async Task<BackupDto> CreateBackupAsync(string? note = null) =>
        await PostAsync<BackupDto>(await AdminAsync(), "/api/backups", new { note });

    private async Task<List<BackupDto>> ListAsync() =>
        (await Client.GetFromJsonAsync<List<BackupDto>>("/api/backups"))!;

    private async Task<BackupDto> PutAsync(Guid id, string? note)
    {
        var response = await Client.PutAsJsonAsync($"/api/backups/{id}", new { note });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<BackupDto>())!;
    }

    private async Task<byte[]> DownloadAsync(Guid id)
    {
        var response = await Client.GetAsync($"/api/backups/{id}/download");
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsByteArrayAsync();
    }

    private async Task<BackupDto> StoreAsync(JsonNode document)
    {
        var response = await UploadAsync(Encoding.UTF8.GetBytes(document.ToJsonString()));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<BackupDto>())!;
    }

    private async Task<HttpResponseMessage> UploadAsync(byte[] file, HttpClient? client = null, string? note = null)
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(file);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");
        content.Add(fileContent, "File", "backup.json.gz");
        if (note is not null) content.Add(new StringContent(note), "Note");
        return await (client ?? await AdminAsync()).PostAsync("/api/backups/upload", content);
    }

    private async Task SignInAgainAsync()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new { email = ApiFixture.TestAdminEmail, password = ApiFixture.TestAdminPassword, rememberMe = false }),
        };
        request.Headers.Add("X-Forwarded-For", Guid.NewGuid().ToString());
        (await Client.SendAsync(request, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
    }

    private static JsonNode Unzip(byte[] file)
    {
        using var archive = new ZipArchive(new MemoryStream(file), ZipArchiveMode.Read);
        using var document = archive.GetEntry("backup.json")!.Open();
        return JsonNode.Parse(document)!;
    }

    private sealed record BackupDto(
        Guid Id,
        DateTimeOffset CreatedAt,
        string? Note,
        long SizeBytes,
        int Tables,
        long Rows,
        int Attachments,
        bool Uploaded,
        bool Restorable);

    private sealed record RestoredDto(DateTimeOffset CreatedAt, int Tables, long Rows, int Attachments);

    private sealed record AttachmentRowDto(Guid Id, string FileName, string Sha256);
}
