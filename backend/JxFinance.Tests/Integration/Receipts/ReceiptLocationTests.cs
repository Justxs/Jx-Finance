using System.Net.Http.Headers;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Receipts;

[Collection<DataCollection>]
public sealed class ReceiptLocationTests(DataFixture fixture) : IntegrationTestBase(fixture)
{
    private const decimal PhotoLatitude = 54.68694m;
    private const decimal PhotoLongitude = 25.28917m;

    private FakeReceiptReader Reader => Services.GetRequiredService<FakeReceiptReader>();

    [Fact]
    public async Task A_reading_of_an_uploaded_photo_with_gps_answers_its_coordinates_and_the_stored_reading_has_none()
    {
        Reader.Reset();
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();

        var reading = await ReadOkAsync<ReadingDto>(await ReadUploadAsync(member, SamplePhoto.VilniusReceipt()));

        Assert.Equal((PhotoLatitude, PhotoLongitude), (reading.PhotoLatitude, reading.PhotoLongitude));
        Assert.Equal(("MAXIMA LT, UAB", "Savanorių pr. 247, LT-02300 Vilnius"), (reading.Result.Merchant, reading.Result.Address));
        var stored = await WithDbAsync(db => db.Database
            .SqlQuery<string>($"""SELECT "Result"::text AS "Value" FROM "ReceiptReadings" WHERE "Id" = {reading.Id}""")
            .SingleAsync(TestContext.Current.CancellationToken));
        Assert.DoesNotContain("54.68", stored, StringComparison.Ordinal);
        Assert.DoesNotContain("25.28", stored, StringComparison.Ordinal);
        Assert.DoesNotContain("latitude", stored, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task A_fresh_upload_that_hits_the_reading_cache_still_answers_its_photo_coordinates()
    {
        Reader.Reset();
        await using var on = await LocationsOnAsync();
        using var member = await CreateUserClientAsync();
        var photo = SamplePhoto.VilniusReceipt();

        var first = await ReadOkAsync<ReadingDto>(await ReadUploadAsync(member, photo));
        var again = await ReadOkAsync<ReadingDto>(await ReadUploadAsync(member, photo));

        Assert.Equal((first.Id, true), (again.Id, again.Cached));
        Assert.Equal((PhotoLatitude, PhotoLongitude), (again.PhotoLatitude, again.PhotoLongitude));
        Assert.Single(Reader.Calls);
    }

    [Fact]
    public async Task An_attached_photo_and_a_reading_with_the_switch_off_answer_no_coordinates()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();
        var photo = SamplePhoto.VilniusReceipt();

        var off = await ReadOkAsync<ReadingDto>(await ReadUploadAsync(member, photo));
        await using var on = await LocationsOnAsync();
        var account = await CreateAccountAsync(client: member);
        var transaction = await CreateTransactionAsync(member, account, null, "expense", "18.21", "2026-09-26", "Maxima");
        var attachment = await AttachAsync(member, transaction.Id, photo);
        var attached = await ReadOkAsync<ReadingDto>(await member.PostAsync(
            "/api/receipts/read",
            new MultipartFormDataContent { { new StringContent(attachment.ToString()), "attachmentId" } },
            TestContext.Current.CancellationToken));

        Assert.Equal((null, null), (off.PhotoLatitude, off.PhotoLongitude));
        Assert.Equal((null, null), (attached.PhotoLatitude, attached.PhotoLongitude));
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

    private static Task<HttpResponseMessage> ReadUploadAsync(HttpClient client, byte[] file)
    {
        var part = new ByteArrayContent(file);
        part.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        var content = new MultipartFormDataContent { { part, "file", "receipt.jpg" } };
        return client.PostAsync("/api/receipts/read", content, TestContext.Current.CancellationToken);
    }

    private sealed record ReadingDto(Guid Id, bool Cached, ResultDto Result, decimal? PhotoLatitude, decimal? PhotoLongitude);

    private sealed record ResultDto(string? Merchant, string? Address);
}
