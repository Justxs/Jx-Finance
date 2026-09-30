using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.RegularExpressions;
using JxFinance.Endpoints.Backups.Services;
using JxFinance.Endpoints.Users.Services;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Users;

[Collection<IntegrationCollection>]
public sealed partial class UserImportTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string ImportUrl = "/api/users/me/import";

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

    private sealed record SpreadEntryDto(Guid Id, int? SpreadMonths, DateOnly? SpreadUntil);
}
