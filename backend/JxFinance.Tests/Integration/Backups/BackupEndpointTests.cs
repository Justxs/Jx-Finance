using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Nodes;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Backups;

[Collection<IntegrationCollection>]
public sealed class BackupEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
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
            var response = await Client.PostAsync($"/api/backups/{backup.Id}/restore", null);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var restored = await response.Content.ReadFromJsonAsync<RestoredDto>();
            Assert.Equal(backup.Rows, restored!.Rows);
            Assert.Equal(backup.Tables, restored.Tables);
            Assert.Equal(HttpStatusCode.Unauthorized, (await Client.GetAsync("/api/settings")).StatusCode);
        }
        finally
        {
            await SignInAgainAsync();
        }

        Assert.Equal("123.45", await CurrentBalanceAsync(keptAccountId));
        Assert.Contains(keptCategoryId.ToString(), await Client.GetStringAsync("/api/categories"));
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync($"/api/accounts/{droppedAccountId}")).StatusCode);
        Assert.Contains(await ListAsync(), b => b.Id == backup.Id);

        using var memberClient = await LoginAsync(member);
        Assert.Equal("123.45", await CurrentBalanceAsync(keptAccountId, memberClient));

        var afterRestore = await CreateUserAsync();
        Assert.NotEqual(Guid.Empty, afterRestore.Id);
    }

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
        var response = await Client.PostAsJsonAsync("/api/backups", new { note = new string('x', 201) });

        await AssertValidationErrorAsync(response, "note");
    }

    [Fact]
    public async Task Deleted_backup_is_gone()
    {
        var backup = await CreateBackupAsync();

        var deleted = await Client.DeleteAsync($"/api/backups/{backup.Id}");
        var again = await Client.DeleteAsync($"/api/backups/{backup.Id}");

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);
        Assert.DoesNotContain(await ListAsync(), b => b.Id == backup.Id);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync($"/api/backups/{backup.Id}/download")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.PostAsync($"/api/backups/{backup.Id}/restore", null)).StatusCode);
    }

    [Fact]
    public async Task Download_is_a_gzip_file_without_sessions()
    {
        var backup = await CreateBackupAsync();

        var response = await Client.GetAsync($"/api/backups/{backup.Id}/download");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/gzip", response.Content.Headers.ContentType?.MediaType);
        Assert.EndsWith(".json.gz", response.Content.Headers.ContentDisposition?.FileName?.Trim('"'));
        var file = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal(backup.SizeBytes, file.Length);

        var document = Unzip(file);
        Assert.Equal("jx-finance-backup", document["format"]!.GetValue<string>());
        var tables = document["tables"]!.AsArray().Select(t => t!["name"]!.GetValue<string>()).ToList();
        Assert.Contains("Accounts", tables);
        Assert.Contains("AspNetUsers", tables);
        Assert.DoesNotContain("UserSessions", tables);
    }

    [Fact]
    public async Task Downloaded_backup_can_be_uploaded_again()
    {
        var original = await CreateBackupAsync();
        var file = await DownloadAsync(original.Id);

        var response = await UploadAsync(file, note: "from the old server");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var uploaded = await response.Content.ReadFromJsonAsync<BackupDto>();
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

        await AssertCodeAsync(response, "backup.invalidFile");
        Assert.Equal(before, (await ListAsync()).Count);
    }

    [Fact]
    public async Task Backup_with_rows_the_database_rejects_is_rolled_back()
    {
        var accountId = await CreateAccountAsync(startingBalance: "10.00");
        var document = Unzip(await DownloadAsync((await CreateBackupAsync()).Id));
        var accounts = document["tables"]!.AsArray().Single(t => t!["name"]!.GetValue<string>() == "Accounts")!;
        var userColumn = accounts["columns"]!.AsArray().Select(c => c!.GetValue<string>()).ToList().IndexOf("UserId");
        accounts["rows"]![0]![userColumn] = Guid.NewGuid().ToString();
        var damaged = await StoreAsync(document);

        var response = await Client.PostAsync($"/api/backups/{damaged.Id}/restore", null);

        await AssertCodeAsync(response, "backup.invalidFile");
        Assert.Equal("10.00", await CurrentBalanceAsync(accountId));
    }

    [Fact]
    public async Task Backup_from_another_database_version_is_listed_but_not_restorable()
    {
        var document = Unzip(await DownloadAsync((await CreateBackupAsync()).Id));
        document["migration"] = "20000101000000_Older";

        var older = await StoreAsync(document);
        var response = await Client.PostAsync($"/api/backups/{older.Id}/restore", null);

        Assert.False(older.Restorable);
        await AssertCodeAsync(response, "backup.schemaMismatch");
    }

    [Fact]
    public async Task Members_cannot_touch_backups()
    {
        var backup = await CreateBackupAsync();
        using var member = await CreateUserClientAsync();

        HttpResponseMessage[] responses =
        [
            await member.GetAsync("/api/backups"),
            await member.PostAsJsonAsync("/api/backups", new { note = (string?)null }),
            await UploadAsync([1, 2, 3], member),
            await member.PutAsJsonAsync($"/api/backups/{backup.Id}", new { note = "mine" }),
            await member.GetAsync($"/api/backups/{backup.Id}/download"),
            await member.PostAsync($"/api/backups/{backup.Id}/restore", null),
            await member.DeleteAsync($"/api/backups/{backup.Id}"),
        ];

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode));
    }

    private Task<BackupDto> CreateBackupAsync(string? note = null) =>
        PostAsync<BackupDto>(Client, "/api/backups", new { note });

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
        return await (client ?? Client).PostAsync("/api/backups/upload", content);
    }

    private async Task SignInAgainAsync()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/auth/login",
            new { email = ApiFixture.TestAdminEmail, password = ApiFixture.TestAdminPassword, rememberMe = false });
        response.EnsureSuccessStatusCode();
    }

    private static JsonNode Unzip(byte[] file)
    {
        using var gzip = new GZipStream(new MemoryStream(file), CompressionMode.Decompress);
        return JsonNode.Parse(gzip)!;
    }

    private static async Task AssertCodeAsync(HttpResponseMessage response, string code)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(code, await response.Content.ReadAsStringAsync());
    }

    private sealed record BackupDto(
        Guid Id,
        DateTimeOffset CreatedAt,
        string? Note,
        long SizeBytes,
        int Tables,
        long Rows,
        bool Uploaded,
        bool Restorable);

    private sealed record RestoredDto(DateTimeOffset CreatedAt, int Tables, long Rows);
}
