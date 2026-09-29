using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using ImageMagick;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Receipts;

[Collection<IntegrationCollection>]
public sealed class ReceiptReadingTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private FakeReceiptReader Reader => Services.GetRequiredService<FakeReceiptReader>();

    [Fact]
    public async Task Reading_answers_feature_disabled_while_the_switch_is_off()
    {
        Reader.Reset();
        await using var off = await FeatureOffAsync("receiptReading");
        using var member = await CreateUserClientAsync();

        var response = await ReadUploadAsync(member, Jpeg());

        await AssertProblemAsync(response, HttpStatusCode.NotFound, ErrorCodes.FeatureDisabled);
        Assert.False((await ReadyAsync(member)).ReceiptReadingReady);
    }

    [Fact]
    public async Task Without_tesseract_a_photo_answers_engine_unavailable_and_reading_is_not_offered()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();
        Assert.True((await ReadyAsync(member)).ReceiptReadingReady);
        Reader.IsAvailable = false;

        var response = await ReadUploadAsync(member, Jpeg());

        await AssertProblemAsync(response, HttpStatusCode.ServiceUnavailable, ErrorCodes.ReceiptEngineUnavailable);
        Assert.False((await ReadyAsync(member)).ReceiptReadingReady);
        Assert.Empty(Reader.Calls);
    }

    [Fact]
    public async Task A_pdf_with_text_is_read_without_the_engine()
    {
        Reader.Reset();
        Reader.IsAvailable = false;
        using var member = await CreateUserClientAsync();
        var pdf = SampleReceiptPdf.Of(1, "RIMI LIETUVA", "2026-09-20 11:05", "Makaronai 500 g  0,99 A", "Kefyras 500 g  1,09 A", "IŠ VISO  2,08");

        var reading = await ReadOkAsync(await ReadUploadAsync(member, pdf, "application/pdf", "receipt.pdf"));

        Assert.Equal(("RIMI LIETUVA", new DateOnly(2026, 9, 20), "2.08"), (reading.Result.Merchant, reading.Result.Date, reading.Result.Total));
        Assert.Equal(["Makaronai 500 g", "Kefyras 500 g"], reading.Result.Items.Select(i => i.Name));
        Assert.Empty(Reader.Calls);
    }

    [Fact]
    public async Task A_pdf_without_text_is_refused_with_its_own_code()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();

        var response = await ReadUploadAsync(member, SampleReceiptPdf.Of(1), "application/pdf", "scan.pdf");

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, ErrorCodes.ReceiptPdfWithoutText);
    }

    [Fact]
    public async Task Reading_an_attachment_answers_the_items_with_the_callers_rule_categories()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();
        var hygiene = await Seed.CategoryAsync(member, "Hygiene");
        var salary = await Seed.CategoryAsync(member, "Side job", "income");
        await Seed.RuleAsync(member, "contains", "šampūnas", hygiene);
        await Seed.RuleAsync(member, "contains", "Colgate", hygiene);
        await Seed.RuleAsync(member, "contains", "Duona", salary);
        var transaction = await NewExpenseAsync(member, "18.21", "2026-09-26");
        var attachment = await AttachAsync(member, transaction, Jpeg());

        var reading = await ReadOkAsync(await ReadAttachmentAsync(member, attachment));

        Assert.False(reading.Cached);
        Assert.Equal(("MAXIMA LT, UAB", new DateOnly(2026, 9, 26), "eur", "18.21"), (reading.Result.Merchant, reading.Result.Date, reading.Result.Currency, reading.Result.Total));
        Assert.Equal(7, reading.Result.Items.Count);
        Assert.Equal([null, null, null, null, null, hygiene, hygiene], reading.Result.Items.Select(i => i.CategoryId));
        Assert.All(reading.Result.Items, item => Assert.False(item.Remembered));
        Assert.Equal(("0.86", "0.10"), (reading.Result.Items[2].Discount, reading.Result.Items[4].Deposit));
        Assert.Equal(("discount", "-0.50"), (reading.Result.Adjustments[0].Kind, reading.Result.Adjustments[0].Amount));
        Assert.Empty(reading.Result.UnreadLines);
        Assert.Empty(reading.Candidates);
        using var sent = new MagickImage(Assert.Single(Reader.Calls));
        Assert.Equal(MagickFormat.Png, sent.Format);
    }

    [Fact]
    public async Task Rules_are_not_used_while_categorization_rules_are_switched_off()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();
        var hygiene = await Seed.CategoryAsync(member, "Hygiene");
        await Seed.RuleAsync(member, "contains", "šampūnas", hygiene);
        await using var off = await FeatureOffAsync("categorizationRules");

        var reading = await ReadOkAsync(await ReadUploadAsync(member, Jpeg()));

        Assert.All(reading.Result.Items, item => Assert.Null(item.CategoryId));
    }

    [Fact]
    public async Task Lines_that_cannot_be_read_come_back_for_the_review()
    {
        Reader.Reset();
        Reader.Answer = FakeReceiptReader.MaximaNoisy;
        using var member = await CreateUserClientAsync();

        var reading = await ReadOkAsync(await ReadUploadAsync(member, Jpeg()));

        Assert.Equal(["Kiausiniai M 10 vnt Z,19 A", "So. ~~ . 7"], reading.Result.UnreadLines);
        Assert.Equal("20.40", reading.Result.Total);
    }

    [Fact]
    public async Task A_stranger_cannot_read_an_attachment_they_cannot_see()
    {
        Reader.Reset();
        using var owner = await CreateUserClientAsync();
        using var stranger = await CreateUserClientAsync();
        var attachment = await AttachAsync(owner, await NewExpenseAsync(owner, "18.21", "2026-09-26"), Jpeg());

        var response = await ReadAttachmentAsync(stranger, attachment);

        await AssertProblemAsync(response, HttpStatusCode.NotFound, ErrorCodes.ResourceNotFound);
        Assert.Empty(Reader.Calls);
    }

    [Fact]
    public async Task A_household_partner_gets_a_reading_of_their_own_with_their_own_categories()
    {
        Reader.Reset();
        using var pair = await CreateHouseholdPairAsync();
        var partnerHygiene = await Seed.CategoryAsync(pair.PartnerClient, "Partner hygiene");
        await Seed.RuleAsync(pair.PartnerClient, "contains", "Colgate", partnerHygiene);
        var account = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var transaction = await CreateTransactionAsync(pair.OwnerClient, account, null, "expense", "18.21", "2026-09-26", "Maxima");
        var attachment = await AttachAsync(pair.OwnerClient, transaction.Id, Jpeg());

        var mine = await ReadOkAsync(await ReadAttachmentAsync(pair.OwnerClient, attachment));
        var theirs = await ReadOkAsync(await ReadAttachmentAsync(pair.PartnerClient, attachment));

        Assert.NotEqual(mine.Id, theirs.Id);
        Assert.False(theirs.Cached);
        Assert.Equal(2, Reader.Calls.Count);
        Assert.Null(mine.Result.Items[5].CategoryId);
        Assert.Equal(partnerHygiene, theirs.Result.Items[5].CategoryId);
    }

    [Fact]
    public async Task Reading_the_same_file_again_answers_the_stored_reading_until_forced()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();
        var file = Jpeg();

        var first = await ReadOkAsync(await ReadUploadAsync(member, file));
        var again = await ReadOkAsync(await ReadUploadAsync(member, file));
        Reader.Answer = FakeReceiptReader.Rimi;
        var forced = await ReadOkAsync(await ReadUploadAsync(member, file, force: true));

        Assert.Equal((first.Id, true), (again.Id, again.Cached));
        Assert.False(forced.Cached);
        Assert.NotEqual(first.Id, forced.Id);
        Assert.Equal(4, forced.Result.Items.Count);
        Assert.Equal(2, Reader.Calls.Count);
        var sha = Sha(file);
        var stored = await WithDbAsync(db => db.ReceiptReadings.IgnoreQueryFilters()
            .Where(r => r.Sha256 == sha)
            .Select(r => r.Id)
            .ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal([forced.Id], stored.Select(id => id.Value));
    }

    [Fact]
    public async Task Two_reads_of_the_same_file_at_once_give_one_conflict()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();
        var file = Jpeg();
        Reader.Hold = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        var first = ReadUploadAsync(member, file);
        while (Reader.Calls.Count == 0)
        {
            await Task.Delay(20, TestContext.Current.CancellationToken);
        }

        var second = await ReadUploadAsync(member, file);
        Reader.Hold.SetResult();

        await AssertProblemAsync(second, HttpStatusCode.Conflict, ErrorCodes.ConflictBusy);
        Assert.Equal(HttpStatusCode.OK, (await first).StatusCode);
    }

    [Fact]
    public async Task A_failed_read_is_kept_as_failed_and_the_next_read_is_not_busy()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();
        var file = Jpeg();
        Reader.FailWith = new DomainError(ErrorCodes.ReceiptUnreadable, "Blurred.");

        var failed = await ReadUploadAsync(member, file);
        Reader.FailWith = null;
        var next = await ReadUploadAsync(member, file);

        await AssertProblemAsync(failed, HttpStatusCode.BadRequest, ErrorCodes.ReceiptUnreadable);
        Assert.False((await ReadOkAsync(next)).Cached);
        var sha = Sha(file);
        var statuses = await WithDbAsync(db => db.ReceiptReadings.IgnoreQueryFilters()
            .Where(r => r.Sha256 == sha)
            .Select(r => r.Status)
            .ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal([ReceiptReadingStatus.Read, ReceiptReadingStatus.Failed], statuses.Order());
    }

    [Fact]
    public async Task An_uploaded_file_is_not_stored_and_offers_the_matching_unsplit_expense()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();
        using var stranger = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var match = await CreateTransactionAsync(member, account, null, "expense", "18.21", "2026-09-27", "MAXIMA LT, UAB VILNIUS");
        var far = await CreateTransactionAsync(member, account, null, "expense", "18.21", "2026-09-20", "Too early");
        await CreateTransactionAsync(member, account, null, "expense", "18.20", "2026-09-26", "Other amount");
        await CreateTransactionAsync(stranger, await CreateAccountAsync(client: stranger), null, "expense", "18.21", "2026-09-26", "Not visible");
        var food = await FoodAsync(member);
        await RecordTransactionAsync(member, new
        {
            accountId = account,
            type = "expense",
            amount = "18.21",
            date = "2026-09-26",
            lines = new[] { new { categoryId = food, amount = "18.21" } },
        });
        var file = Jpeg();

        var reading = await ReadOkAsync(await ReadUploadAsync(member, file));

        var candidate = Assert.Single(reading.Candidates);
        Assert.Equal((match.Id, account, "18.21", "eur"), (candidate.Id, candidate.AccountId, candidate.Amount, candidate.Currency));
        Assert.NotEqual(far.Id, candidate.Id);
        var sha = Sha(file);
        Assert.False(await WithDbAsync(db => db.TransactionAttachments.IgnoreQueryFilters()
            .AnyAsync(a => a.Sha256 == sha, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task A_chosen_category_is_remembered_before_rules_for_the_next_receipt_while_the_category_exists()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();
        var food = await FoodAsync(member);
        var bread = await Seed.CategoryAsync(member, "Bakery");
        await Seed.RuleAsync(member, "contains", "Duona", food);
        await Seed.RuleAsync(member, "contains", "Pienas", food);
        var reading = await ReadOkAsync(await ReadUploadAsync(member, Jpeg()));
        Assert.Equal((food, false), (reading.Result.Items[0].CategoryId, reading.Result.Items[0].Remembered));

        var saved = await member.PutAsJsonAsync(
            $"/api/receipts/{reading.Id}/categories",
            new { items = new object[] { new { index = 0, categoryId = bread }, new { index = 1, categoryId = (Guid?)null } } },
            TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, saved.StatusCode);

        Reader.Answer = FakeReceiptReader.MaximaNoisy;
        var next = await ReadOkAsync(await ReadUploadAsync(member, Jpeg()));
        Assert.Equal("Duona BOCIU 800 g", next.Result.Items[0].Name);
        Assert.Equal((bread, true), (next.Result.Items[0].CategoryId, next.Result.Items[0].Remembered));
        Assert.Equal((food, false), (next.Result.Items[1].CategoryId, next.Result.Items[1].Remembered));

        (await member.DeleteAsync($"/api/categories/{bread}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var withoutBakery = await ReadOkAsync(await ReadUploadAsync(member, Jpeg()));
        Assert.Equal((food, false), (withoutBakery.Result.Items[0].CategoryId, withoutBakery.Result.Items[0].Remembered));

        (await member.PostAsJsonAsync("/api/trash/restore", new { kind = "category", entityId = bread }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var restored = await ReadOkAsync(await ReadUploadAsync(member, Jpeg()));
        Assert.Equal((bread, true), (restored.Result.Items[0].CategoryId, restored.Result.Items[0].Remembered));
    }

    [Fact]
    public async Task Choosing_an_income_category_for_an_item_is_refused()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();
        var salary = await Seed.CategoryAsync(member, "Side job", "income");
        var reading = await ReadOkAsync(await ReadUploadAsync(member, Jpeg()));

        var response = await member.PutAsJsonAsync(
            $"/api/receipts/{reading.Id}/categories",
            new { items = new[] { new { index = 0, categoryId = salary } } },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, ErrorCodes.CategoryWrongType);
    }

    [Fact]
    public async Task A_return_receipt_is_marked_as_a_return()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();
        Reader.Answer = FakeReceiptReader.Return;

        var reading = await ReadOkAsync(await ReadUploadAsync(member, Jpeg()));

        Assert.True(reading.Result.IsReturn);
    }

    [Fact]
    public async Task The_purge_keeps_readings_while_their_file_exists_and_removes_the_rest_after_a_day()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();
        var transaction = await NewExpenseAsync(member, "18.21", "2026-09-26");
        var attachment = await AttachAsync(member, transaction, Jpeg());
        var attached = await ReadOkAsync(await ReadAttachmentAsync(member, attachment));
        var unattached = await ReadOkAsync(await ReadUploadAsync(member, Jpeg()));
        Reader.FailWith = new DomainError(ErrorCodes.ReceiptUnreadable, "Blurred.");
        await ReadUploadAsync(member, Jpeg());
        Reader.FailWith = null;
        (await member.DeleteAsync($"/api/attachments/{attachment}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var userId = await WithDbAsync(db => db.ReceiptReadings.IgnoreQueryFilters()
            .Where(r => r.Id == new ReceiptReadingId(attached.Id))
            .Select(r => r.UserId)
            .SingleAsync(TestContext.Current.CancellationToken));
        await BackdateReadingsAsync(userId, TimeSpan.FromHours(25));

        await Job<AttachmentPurgeJob>().RunOnceAsync(TestContext.Current.CancellationToken);

        Assert.Equal([attached.Id], await ReadingIdsAsync(userId));
        Assert.DoesNotContain(unattached.Id, await ReadingIdsAsync(userId));

        await WithDbAsync(db => db.TransactionAttachments.IgnoreQueryFilters()
            .Where(a => a.Id == new TransactionAttachmentId(attachment))
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.UpdatedAt, DateTimeOffset.UtcNow.AddDays(-31)), TestContext.Current.CancellationToken));
        await Job<AttachmentPurgeJob>().RunOnceAsync(TestContext.Current.CancellationToken);

        Assert.Empty(await ReadingIdsAsync(userId));
    }

    [Fact]
    public async Task A_split_entered_from_a_receipt_is_linked_by_the_next_import_and_keeps_its_lines()
    {
        var account = await CreateAccountAsync("100.00");
        var food = await Seed.CategoryAsync(Client, $"Food {Guid.NewGuid():N}");
        var hygiene = await Seed.CategoryAsync(Client, $"Hygiene {Guid.NewGuid():N}");
        var entered = await RecordTransactionAsync(Client, new
        {
            accountId = account,
            type = "expense",
            amount = "18.21",
            date = "2026-09-26",
            description = "MAXIMA LT, UAB",
            lines = new[]
            {
                new { categoryId = food, amount = "10.15", description = "Duona, Pienas, Sūris, Bananai, Mineralinis vanduo" },
                new { categoryId = hygiene, amount = "8.06", description = "Colgate dantų pasta, Head&Shoulders šampūnas" },
            },
        });
        var marker = Guid.NewGuid().ToString("N")[..8];
        var csv = "\"Sąskaitos Nr.\",\"\",\"Data\",\"Gavėjas\",\"Paaiškinimai\",\"Suma\",\"Valiuta\",\"D/K\",\"Įrašo Nr.\"\n"
            + $"\"LT476300010172306416\",\"20\",\"2026-09-27\",\"MAXIMA\",\"MAXIMA LT, UAB VILNIUS\",\"18.21\",\"EUR\",\"D\",\"RECEIPT-{marker}\"\n";

        var preview = await ReadOkAsync<ImportPreviewDto>(await UploadCsvAsync(Client, account, csv));
        var row = Assert.Single(preview.Rows);
        Assert.Equal(entered.Id, row.MatchedTransaction?.Id);
        await PostAsync<System.Text.Json.JsonElement>(Client, "/api/import/confirm", new
        {
            accountId = account,
            rows = new[] { new { importRef = row.ImportRef, amount = row.Amount, type = row.Type, date = row.Date, description = row.Description, existingTransactionId = entered.Id } },
        });

        var linked = await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{entered.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(("imported", true), (linked!.Source, linked.IsSplit));
        Assert.Equal(["10.15", "8.06"], linked.Lines!.Select(l => l.Amount).Order(StringComparer.Ordinal));
    }

    private static byte[] Jpeg()
    {
        using var image = new MagickImage(
            new MagickColor((byte)Random.Shared.Next(256), (byte)Random.Shared.Next(256), (byte)Random.Shared.Next(256)),
            400,
            600);
        return image.ToByteArray(MagickFormat.Jpeg);
    }

    private static string Sha(byte[] file) => Convert.ToHexStringLower(SHA256.HashData(file));

    private static async Task<ReadyDto> ReadyAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<ReadyDto>("/api/settings", TestContext.Current.CancellationToken))!;

    private Task BackdateReadingsAsync(Guid userId, TimeSpan age) =>
        WithDbAsync(db => db.ReceiptReadings.IgnoreQueryFilters()
            .Where(r => r.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.CreatedAt, DateTimeOffset.UtcNow - age), TestContext.Current.CancellationToken));

    private Task<List<Guid>> ReadingIdsAsync(Guid userId) =>
        WithDbAsync(async db => (await db.ReceiptReadings.IgnoreQueryFilters()
                .Where(r => r.UserId == userId)
                .Select(r => r.Id)
                .ToListAsync(TestContext.Current.CancellationToken))
            .Select(id => id.Value)
            .ToList());

    private static async Task<Guid> FoodAsync(HttpClient client)
    {
        var all = await client.GetFromJsonAsync<List<NamedRow>>("/api/categories", TestContext.Current.CancellationToken);
        return all!.Single(c => c.Name == "Food").Id;
    }

    private async Task<Guid> NewExpenseAsync(HttpClient client, string amount, string date)
    {
        var account = await CreateAccountAsync(client: client);
        return (await CreateTransactionAsync(client, account, null, "expense", amount, date, "Maxima")).Id;
    }

    private static async Task<Guid> AttachAsync(HttpClient client, Guid transactionId, byte[] file)
    {
        using var content = new MultipartFormDataContent();
        var part = new ByteArrayContent(file);
        part.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        content.Add(part, "file", "receipt.jpg");
        var response = await client.PostAsync($"/api/transactions/{transactionId}/attachments", content, TestContext.Current.CancellationToken);
        return (await ReadOkAsync<IdDto>(response)).Id;
    }

    private static Task<HttpResponseMessage> ReadAttachmentAsync(HttpClient client, Guid attachmentId)
    {
        var content = new MultipartFormDataContent { { new StringContent(attachmentId.ToString()), "attachmentId" } };
        return client.PostAsync("/api/receipts/read", content, TestContext.Current.CancellationToken);
    }

    private static Task<HttpResponseMessage> ReadUploadAsync(
        HttpClient client,
        byte[] file,
        string contentType = "image/jpeg",
        string fileName = "receipt.jpg",
        bool force = false)
    {
        var part = new ByteArrayContent(file);
        part.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        var content = new MultipartFormDataContent { { part, "file", fileName } };
        if (force)
        {
            content.Add(new StringContent("true"), "force");
        }

        return client.PostAsync("/api/receipts/read", content, TestContext.Current.CancellationToken);
    }

    private static Task<ReadingDto> ReadOkAsync(HttpResponseMessage response) => ReadOkAsync<ReadingDto>(response);

    private sealed record ReadyDto(bool ReceiptReadingReady);

    private sealed record ReadingDto(Guid Id, bool Cached, ResultDto Result, List<CandidateDto> Candidates);

    private sealed record ResultDto(
        string? Merchant,
        DateOnly? Date,
        string? Currency,
        string? Total,
        bool IsReturn,
        int PagesRead,
        int PageCount,
        List<ItemDto> Items,
        List<AdjustmentDto> Adjustments,
        List<string> UnreadLines);

    private sealed record ItemDto(string Name, string? Quantity, string Amount, string Discount, string Deposit, Guid? CategoryId, bool Remembered);

    private sealed record AdjustmentDto(string Kind, string Label, string Amount);

    private sealed record CandidateDto(Guid Id, Guid AccountId, DateOnly Date, string? Description, string Amount, string Currency);

    private sealed record ImportPreviewDto(List<ImportRowDto> Rows);

    private sealed record ImportRowDto(string ImportRef, DateOnly Date, string? Description, string Amount, string Type, MatchedDto? MatchedTransaction);

    private sealed record MatchedDto(Guid Id);
}
