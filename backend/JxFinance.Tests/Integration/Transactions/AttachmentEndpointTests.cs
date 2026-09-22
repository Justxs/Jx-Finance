using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class AttachmentEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string ScopeHeader = "X-Active-Household";
    private const string Date = "2026-06-05";

    private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private readonly string directory = fixture.AttachmentDirectory;

    [Fact]
    public async Task An_uploaded_receipt_is_listed_counted_and_downloaded_byte_for_byte()
    {
        var transaction = await NewTransactionAsync(Client);
        var png = Png(2048);

        var response = await UploadAsync(Client, transaction, png, "receipt.png", "image/png");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var attachment = (await response.Content.ReadFromJsonAsync<AttachmentDto>(TestContext.Current.CancellationToken))!;
        Assert.Equal("receipt.png", attachment.FileName);
        Assert.Equal("image/png", attachment.ContentType);
        Assert.Equal(png.Length, attachment.SizeBytes);
        Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(png)), attachment.Sha256);
        Assert.Equal("Test Admin", attachment.UploadedByName);

        var listed = await ListAsync(Client, transaction);
        Assert.Equal([attachment.Id], listed.Select(a => a.Id));
        Assert.Equal(1, (await Client.GetFromJsonAsync<CountDto>($"/api/transactions/{transaction}", TestContext.Current.CancellationToken))!.AttachmentCount);
        var description = (await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{transaction}", TestContext.Current.CancellationToken))!.Description;
        var page = await Client.GetFromJsonAsync<PageDto<CountDto>>($"/api/transactions?search={description}", TestContext.Current.CancellationToken);
        Assert.Equal(1, Assert.Single(page!.Items).AttachmentCount);

        var download = await Client.GetAsync($"/api/attachments/{attachment.Id}/content", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal("image/png", download.Content.Headers.ContentType?.MediaType);
        Assert.Equal("attachment", download.Content.Headers.ContentDisposition?.DispositionType);
        Assert.Equal("receipt.png", download.Content.Headers.ContentDisposition?.FileName?.Trim('"'));
        Assert.Equal("nosniff", download.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Contains("sandbox", download.Headers.GetValues("Content-Security-Policy").Single());
        Assert.Equal(png, await download.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_download_with_the_current_etag_answers_not_modified()
    {
        var transaction = await NewTransactionAsync(Client);
        var attachment = await UploadOkAsync(Client, transaction, Png(64), "a.png", "image/png");

        using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/attachments/{attachment.Id}/content");
        request.Headers.IfNoneMatch.Add(new EntityTagHeaderValue($"\"{attachment.Sha256}\""));
        var response = await Client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotModified, response.StatusCode);
    }

    [Fact]
    public async Task The_file_is_stored_under_its_id_and_the_name_loses_its_path_and_gets_the_right_extension()
    {
        var transaction = await NewTransactionAsync(Client);
        var pdf = Encoding.ASCII.GetBytes("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF");

        var traversal = await UploadOkAsync(Client, transaction, pdf, "..\\..\\etc/pass<wd>.pdf", "application/octet-stream");
        var disguised = await UploadOkAsync(Client, transaction, Png(32), "invoice.pdf", null);
        var nameless = await UploadOkAsync(Client, transaction, Png(32), "...", "image/png");

        Assert.Equal("application/pdf", traversal.ContentType);
        Assert.Equal("passwd.pdf", traversal.FileName);
        Assert.Equal("image/png", disguised.ContentType);
        Assert.Equal("invoice.pdf.png", disguised.FileName);
        Assert.Equal("attachment.png", nameless.FileName);
        Assert.True(File.Exists(Path.Combine(directory, traversal.Id.ToString("N"))));
        Assert.Empty(Directory.EnumerateFiles(directory, "*pass*", SearchOption.AllDirectories));
        Assert.Empty(Directory.EnumerateFiles(Path.GetDirectoryName(directory)!, "*.pdf", SearchOption.AllDirectories));
    }

    [Fact]
    public async Task A_type_outside_the_allow_list_is_refused()
    {
        var transaction = await NewTransactionAsync(Client);

        var text = await UploadAsync(Client, transaction, Encoding.UTF8.GetBytes("hello"), "notes.txt", "text/plain");
        var html = await UploadAsync(Client, transaction, Encoding.UTF8.GetBytes("<html><script>alert(1)</script>"), "page.html", null);
        var gif = await UploadAsync(Client, transaction, Encoding.ASCII.GetBytes("GIF89a......"), "a.gif", "image/gif");

        await AssertRejectedAsync(text, "attachment.typeNotAllowed");
        await AssertRejectedAsync(html, "attachment.typeNotAllowed");
        await AssertRejectedAsync(gif, "attachment.typeNotAllowed");
        Assert.Empty(await ListAsync(Client, transaction));
    }

    [Fact]
    public async Task Content_that_does_not_match_the_declared_type_is_refused()
    {
        var transaction = await NewTransactionAsync(Client);

        var script = await UploadAsync(Client, transaction, Encoding.UTF8.GetBytes("<svg onload=alert(1)>"), "photo.png", "image/png");
        var pngAsPdf = await UploadAsync(Client, transaction, Png(32), "scan.pdf", "application/pdf");

        await AssertRejectedAsync(script, "attachment.contentMismatch");
        await AssertRejectedAsync(pngAsPdf, "attachment.contentMismatch");
        Assert.Empty(await ListAsync(Client, transaction));
        Assert.Empty(Directory.EnumerateFiles(directory, "*.tmp"));
    }

    [Fact]
    public async Task An_empty_file_a_missing_file_and_a_file_over_ten_megabytes_are_refused()
    {
        var transaction = await NewTransactionAsync(Client);

        var empty = await UploadAsync(Client, transaction, [], "empty.png", "image/png");
        using var nothing = new MultipartFormDataContent { { new StringContent("x"), "note" } };
        var missing = await Client.PostAsync($"/api/transactions/{transaction}/attachments", nothing, TestContext.Current.CancellationToken);
        var oversized = await UploadAsync(Client, transaction, Png((int)TransactionAttachment.MaxFileBytes + 1), "big.png", "image/png");

        await AssertRejectedAsync(empty, "attachment.empty");
        await AssertValidationErrorAsync(missing, "file");
        await AssertRejectedAsync(oversized, "attachment.tooLarge");
        Assert.Empty(await ListAsync(Client, transaction));
    }

    [Fact]
    public async Task The_eleventh_file_of_a_transaction_is_refused()
    {
        var transaction = await NewTransactionAsync(Client);
        for (var i = 0; i < TransactionAttachment.MaxPerTransaction; i++)
        {
            await UploadOkAsync(Client, transaction, Png(16), $"{i}.png", "image/png");
        }

        var response = await UploadAsync(Client, transaction, Png(16), "one-too-many.png", "image/png");

        await AssertProblemAsync(response, HttpStatusCode.Conflict, "attachment.limitReached");
    }

    [Fact]
    public async Task A_removed_file_goes_to_the_trash_stays_on_disk_and_comes_back()
    {
        using var member = await CreateUserClientAsync();
        var transaction = await NewTransactionAsync(member, "Maxima");
        var attachment = await UploadOkAsync(member, transaction, Png(128), "receipt.png", "image/png");

        var deleted = await member.DeleteAsync($"/api/attachments/{attachment.Id}", TestContext.Current.CancellationToken);
        var afterDelete = await ListAsync(member, transaction);
        var download = await member.GetAsync($"/api/attachments/{attachment.Id}/content", TestContext.Current.CancellationToken);
        var trash = await member.GetFromJsonAsync<PageDto<TrashRowDto>>("/api/trash", TestContext.Current.CancellationToken);
        var restore = await member.PostAsJsonAsync("/api/trash/restore", new { kind = "attachment", entityId = attachment.Id }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Empty(afterDelete);
        Assert.Equal(HttpStatusCode.NotFound, download.StatusCode);
        var row = Assert.Single(trash!.Items);
        Assert.Equal("attachment", row.Kind);
        Assert.Equal("receipt.png, Maxima, 12.30 EUR", row.Description);
        Assert.True(File.Exists(Path.Combine(directory, attachment.Id.ToString("N"))));
        Assert.Equal(HttpStatusCode.NoContent, restore.StatusCode);
        Assert.Equal([attachment.Id], (await ListAsync(member, transaction)).Select(a => a.Id));
    }

    [Fact]
    public async Task Deleting_a_transaction_keeps_its_files_and_restoring_it_brings_them_back()
    {
        using var member = await CreateUserClientAsync();
        var transaction = await NewTransactionAsync(member);
        var attachment = await UploadOkAsync(member, transaction, Png(64), "a.png", "image/png");

        (await member.DeleteAsync($"/api/transactions/{transaction}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var whileDeleted = await member.GetAsync($"/api/transactions/{transaction}/attachments", TestContext.Current.CancellationToken);
        var downloadWhileDeleted = await member.GetAsync($"/api/attachments/{attachment.Id}/content", TestContext.Current.CancellationToken);
        (await member.PostAsJsonAsync("/api/trash/restore", new { kind = "transaction", entityId = transaction }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.NotFound, whileDeleted.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, downloadWhileDeleted.StatusCode);
        Assert.Equal([attachment.Id], (await ListAsync(member, transaction)).Select(a => a.Id));
        Assert.Equal(HttpStatusCode.OK, (await member.GetAsync($"/api/attachments/{attachment.Id}/content", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task A_file_cannot_come_back_while_its_transaction_is_deleted()
    {
        using var member = await CreateUserClientAsync();
        var transaction = await NewTransactionAsync(member);
        var attachment = await UploadOkAsync(member, transaction, Png(64), "a.png", "image/png");
        (await member.DeleteAsync($"/api/attachments/{attachment.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await member.DeleteAsync($"/api/transactions/{transaction}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var restore = await member.PostAsJsonAsync("/api/trash/restore", new { kind = "attachment", entityId = attachment.Id }, TestContext.Current.CancellationToken);

        await AssertRejectedAsync(restore, "restore.referenceMissing");
    }

    [Fact]
    public async Task Another_user_cannot_see_upload_download_or_remove_the_files()
    {
        var transaction = await NewTransactionAsync(Client);
        var attachment = await UploadOkAsync(Client, transaction, Png(64), "a.png", "image/png");
        using var stranger = await CreateUserClientAsync();

        HttpResponseMessage[] responses =
        [
            await stranger.GetAsync($"/api/transactions/{transaction}/attachments", TestContext.Current.CancellationToken),
            await UploadAsync(stranger, transaction, Png(16), "b.png", "image/png"),
            await stranger.GetAsync($"/api/attachments/{attachment.Id}/content", TestContext.Current.CancellationToken),
            await stranger.DeleteAsync($"/api/attachments/{attachment.Id}", TestContext.Current.CancellationToken),
            await stranger.PostAsJsonAsync("/api/trash/restore", new { kind = "attachment", entityId = attachment.Id }, TestContext.Current.CancellationToken),
        ];

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.NotFound, r.StatusCode));
        Assert.Single(await ListAsync(Client, transaction));
    }

    [Fact]
    public async Task Household_members_share_the_files_of_a_shared_account_within_its_household_only()
    {
        var member = await CreateUserAsync();
        var household = await CreateHouseholdAsync(member);
        var elsewhere = await CreateHouseholdAsync(member);
        var account = await CreateAccountAsync(householdId: household);
        var transaction = (await CreateTransactionAsync(Client, account, null, "expense", "5.00", Date, $"Shared {Guid.NewGuid():N}")).Id;
        var mine = await UploadOkAsync(Client, transaction, Png(64), "admin.png", "image/png");
        using var memberClient = await LoginAsync(member);

        var theirs = await UploadOkAsync(memberClient, transaction, Png(64), "member.png", "image/png");
        var listed = await ListAsync(memberClient, transaction);
        var download = await memberClient.GetAsync($"/api/attachments/{mine.Id}/content", TestContext.Current.CancellationToken);
        using var scoped = new HttpRequestMessage(HttpMethod.Get, $"/api/attachments/{mine.Id}/content");
        scoped.Headers.Add(ScopeHeader, elsewhere.ToString());
        var outOfScope = await memberClient.SendAsync(scoped, TestContext.Current.CancellationToken);

        Assert.Equal([mine.Id, theirs.Id], listed.Select(a => a.Id));
        Assert.Equal(member.Id, theirs.UploadedById);
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, outOfScope.StatusCode);
    }

    [Fact]
    public async Task Adding_and_removing_a_file_on_a_shared_account_is_in_the_household_log()
    {
        var household = await CreateHouseholdAsync();
        var account = await CreateAccountAsync(householdId: household);
        var transaction = (await CreateTransactionAsync(Client, account, null, "expense", "9.99", Date, "Rimi")).Id;
        var personal = await NewTransactionAsync(Client);

        var attachment = await UploadOkAsync(Client, transaction, Png(64), "rimi.png", "image/png");
        await UploadOkAsync(Client, personal, Png(64), "private.png", "image/png");
        (await Client.DeleteAsync($"/api/attachments/{attachment.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await Client.PostAsJsonAsync("/api/trash/restore", new { kind = "attachment", entityId = attachment.Id }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var log = (await Client.GetFromJsonAsync<PageDto<AuditRowDto>>($"/api/households/{household}/audit?pageSize=50", TestContext.Current.CancellationToken))!;
        var rows = log.Items.Where(e => e.EntityKind == "attachment").ToList();

        Assert.Equal(["restored", "deleted", "created"], rows.Select(r => r.Action));
        Assert.All(rows, r => Assert.Equal(attachment.Id, r.EntityId));
        Assert.All(rows, r => Assert.Equal("rimi.png, Rimi, 9.99 EUR", r.Description));
        Assert.DoesNotContain(log.Items, e => e.Description.Contains("private.png", StringComparison.Ordinal));
    }

    [Fact]
    public async Task The_purge_job_removes_files_deleted_over_thirty_days_ago_and_orphans()
    {
        using var member = await CreateUserClientAsync();
        var transaction = await NewTransactionAsync(member);
        var kept = await UploadOkAsync(member, transaction, Png(64), "kept.png", "image/png");
        var recent = await UploadOkAsync(member, transaction, Png(64), "recent.png", "image/png");
        var expired = await UploadOkAsync(member, transaction, Png(64), "expired.png", "image/png");
        var gone = await NewTransactionAsync(member);
        var withGone = await UploadOkAsync(member, gone, Png(64), "gone.png", "image/png");
        (await member.DeleteAsync($"/api/attachments/{recent.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await member.DeleteAsync($"/api/attachments/{expired.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await member.DeleteAsync($"/api/transactions/{gone}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        await BackdateAsync(expired.Id, gone);
        var oldOrphan = WriteOrphan(TimeSpan.FromHours(2));
        var newOrphan = WriteOrphan(TimeSpan.Zero);

        await new AttachmentPurgeJob(
            Services.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<AttachmentPurgeJob>.Instance).RunOnceAsync(TestContext.Current.CancellationToken);

        Assert.True(FileExists(kept.Id));
        Assert.True(FileExists(recent.Id));
        Assert.False(FileExists(expired.Id));
        Assert.False(FileExists(withGone.Id));
        Assert.False(FileExists(oldOrphan));
        Assert.True(FileExists(newOrphan));
        Assert.Equal([kept.Id, recent.Id], await StoredIdsAsync(transaction));
        Assert.Empty(await StoredIdsAsync(gone));
        await AssertProblemAsync(
            await member.PostAsJsonAsync("/api/trash/restore", new { kind = "attachment", entityId = expired.Id }, TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "restore.expired");
        File.Delete(Path.Combine(directory, newOrphan.ToString("N")));
    }

    private Task BackdateAsync(Guid attachmentId, Guid transactionId) =>
        WithDbAsync(async db =>
        {
            var old = DateTimeOffset.UtcNow.AddDays(-31);
            var typedAttachment = new TransactionAttachmentId(attachmentId);
            var typedTransaction = new TransactionId(transactionId);
            await db.TransactionAttachments.IgnoreQueryFilters()
                .Where(a => a.Id == typedAttachment)
                .ExecuteUpdateAsync(s => s.SetProperty(a => a.UpdatedAt, old), TestContext.Current.CancellationToken);
            await db.Transactions.IgnoreQueryFilters()
                .Where(t => t.Id == typedTransaction)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.UpdatedAt, old), TestContext.Current.CancellationToken);
            await db.DeletionEntries.IgnoreQueryFilters()
                .Where(e => e.EntityId == attachmentId || e.EntityId == transactionId)
                .ExecuteUpdateAsync(s => s.SetProperty(e => e.DeletedAt, old), TestContext.Current.CancellationToken);
        });

    private Task<List<Guid>> StoredIdsAsync(Guid transactionId) =>
        WithDbAsync(async db =>
        {
            var typedId = new TransactionId(transactionId);
            var stored = await db.TransactionAttachments.IgnoreQueryFilters()
                .Where(a => a.TransactionId == typedId)
                .OrderBy(a => a.CreatedAt)
                .Select(a => a.Id)
                .ToListAsync(TestContext.Current.CancellationToken);
            List<Guid> ids = [.. stored.Select(id => id.Value)];
            return ids;
        });

    private Guid WriteOrphan(TimeSpan age)
    {
        var id = Guid.NewGuid();
        var path = Path.Combine(directory, id.ToString("N"));
        Directory.CreateDirectory(directory);
        File.WriteAllBytes(path, [1, 2, 3]);
        File.SetLastWriteTimeUtc(path, DateTime.UtcNow - age);
        return id;
    }

    private bool FileExists(Guid id) => File.Exists(Path.Combine(directory, id.ToString("N")));

    private static async Task<Guid> NewTransactionAsync(HttpClient client, string? description = null)
    {
        var account = (await PostAsync<IdDto>(
            client,
            "/api/accounts",
            new { name = $"Account {Guid.NewGuid():N}", type = "checking", startingBalance = "0.00", scope = "personal" })).Id;
        var created = await CreateTransactionAsync(client, account, null, "expense", "12.30", Date, description ?? $"Receipt {Guid.NewGuid():N}");
        return created.Id;
    }

    private static byte[] Png(int length)
    {
        var bytes = new byte[Math.Max(length, PngSignature.Length)];
        Random.Shared.NextBytes(bytes);
        PngSignature.CopyTo(bytes, 0);
        return length == 0 ? [] : bytes;
    }

    private static async Task<List<AttachmentDto>> ListAsync(HttpClient client, Guid transactionId)
    {
        var response = await client.GetAsync($"/api/transactions/{transactionId}/attachments");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<List<AttachmentDto>>())!;
    }

    private static async Task<AttachmentDto> UploadOkAsync(HttpClient client, Guid transactionId, byte[] file, string name, string? contentType)
    {
        var response = await UploadAsync(client, transactionId, file, name, contentType);
        Assert.True(response.StatusCode == HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<AttachmentDto>())!;
    }

    private static async Task<HttpResponseMessage> UploadAsync(HttpClient client, Guid transactionId, byte[] file, string name, string? contentType)
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(file);
        if (contentType is not null)
        {
            fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        }

        content.Add(fileContent, "file", name);
        return await client.PostAsync($"/api/transactions/{transactionId}/attachments", content);
    }

    private sealed record AttachmentDto(
        Guid Id,
        Guid TransactionId,
        string FileName,
        string ContentType,
        long SizeBytes,
        string Sha256,
        Guid UploadedById,
        string UploadedByName,
        DateTimeOffset UploadedAt);

    private sealed record CountDto(Guid Id, int AttachmentCount);

    private sealed record TrashRowDto(Guid Id, string Kind, Guid EntityId, string Description, DateTimeOffset DeletedAt);

    private sealed record AuditRowDto(string Action, string EntityKind, Guid? EntityId, string Description);
}
