using System.Net.Http.Headers;
using ImageMagick;
using JxFinance.Tests.Support;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Receipts;

[Collection<DataCollection>]
public sealed class ReceiptReturnTests(DataFixture fixture) : IntegrationTestBase(fixture)
{
    private FakeReceiptReader Reader => Services.GetRequiredService<FakeReceiptReader>();

    [Fact]
    public async Task A_return_links_the_latest_purchase_the_bank_described_under_the_shops_name()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        await Expense(member, account, "20.00", "2026-09-10", "MAXIMA LT, UAB VILNIUS");
        var latest = await Expense(member, account, "12.00", "2026-09-26", "MAXIMA LT, UAB VILNIUS");
        await Expense(member, account, "30.00", "2026-09-26", "MAXIMALUS SPORTAS");
        await Expense(member, account, "30.00", "2026-09-28", "MAXIMA LT, UAB VILNIUS");

        var reading = await ReadReturnAsync(member, Jpeg());

        Assert.Equal(("EUR", "4.79"), (reading.Result.Currency?.ToUpperInvariant(), reading.Result.Total));
        Assert.Empty(reading.Candidates);
        Assert.Equal((latest, new DateOnly(2026, 9, 26), "MAXIMA LT, UAB VILNIUS"), (reading.RefundOf!.Id, reading.RefundOf.Date, reading.RefundOf.Description));
    }

    [Fact]
    public async Task A_purchase_smaller_than_the_return_is_passed_over()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var earlier = await Expense(member, account, "4.79", "2026-09-01", "Maxima LT, UAB");
        await Expense(member, account, "4.78", "2026-09-26", "Maxima LT, UAB");

        Assert.Equal(earlier, (await ReadReturnAsync(member, Jpeg())).RefundOf!.Id);
    }

    [Fact]
    public async Task A_purchase_more_than_ninety_days_before_the_return_is_too_old()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var oldest = await Expense(member, account, "10.00", "2026-06-29", "MAXIMA LT, UAB");

        Assert.Equal(oldest, (await ReadReturnAsync(member, Jpeg())).RefundOf!.Id);

        using var other = await CreateUserClientAsync();
        await Expense(other, await CreateAccountAsync(client: other), "10.00", "2026-06-28", "MAXIMA LT, UAB");
        Assert.Null((await ReadReturnAsync(other, Jpeg())).RefundOf);
    }

    [Fact]
    public async Task A_purchase_in_another_currency_or_a_refund_is_not_linked()
    {
        using var member = await CreateUserClientAsync();
        var dollars = await CreateAccountAsync(currency: "usd", client: member);
        var euros = await CreateAccountAsync(client: member);
        await Expense(member, dollars, "10.00", "2026-09-26", "MAXIMA LT, UAB");
        await Expense(member, euros, "-10.00", "2026-09-26", "MAXIMA LT, UAB");

        Assert.Null((await ReadReturnAsync(member, Jpeg())).RefundOf);
    }

    [Fact]
    public async Task Another_members_purchase_is_never_linked()
    {
        using var member = await CreateUserClientAsync();
        using var stranger = await CreateUserClientAsync();
        await Expense(stranger, await CreateAccountAsync(client: stranger), "10.00", "2026-09-26", "MAXIMA LT, UAB");

        Assert.Null((await ReadReturnAsync(member, Jpeg())).RefundOf);
    }

    [Fact]
    public async Task The_expense_the_return_is_attached_to_is_never_linked_to_itself()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var earlier = await Expense(member, account, "10.00", "2026-09-20", "MAXIMA LT, UAB");
        var carrier = await Expense(member, account, "10.00", "2026-09-26", "MAXIMA LT, UAB");
        var attachment = await AttachAsync(member, carrier, Jpeg());
        Reader.Reset();
        Reader.Answer = FakeReceiptReader.Return;

        var form = new MultipartFormDataContent { { new StringContent(attachment.ToString()), "attachmentId" } };
        var reading = await ReadOkAsync<ReadingDto>(await member.PostAsync("/api/receipts/read", form, TestContext.Current.CancellationToken));

        Assert.Equal(earlier, reading.RefundOf!.Id);
    }

    private async Task<ReadingDto> ReadReturnAsync(HttpClient client, byte[] file)
    {
        Reader.Reset();
        Reader.Answer = FakeReceiptReader.Return;
        var part = new ByteArrayContent(file);
        part.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        var form = new MultipartFormDataContent { { part, "file", "return.jpg" } };
        var reading = await ReadOkAsync<ReadingDto>(await client.PostAsync("/api/receipts/read", form, TestContext.Current.CancellationToken));
        Assert.True(reading.Result.IsReturn);
        Assert.Equal(new DateOnly(2026, 9, 27), reading.Result.Date);
        return reading;
    }

    private static async Task<Guid> Expense(HttpClient client, Guid account, string amount, string date, string description) =>
        (await CreateTransactionAsync(client, account, null, "expense", amount, date, description)).Id;

    private static async Task<Guid> AttachAsync(HttpClient client, Guid transactionId, byte[] file)
    {
        var part = new ByteArrayContent(file);
        part.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        using var content = new MultipartFormDataContent { { part, "file", "receipt.jpg" } };
        var response = await client.PostAsync($"/api/transactions/{transactionId}/attachments", content, TestContext.Current.CancellationToken);
        return (await ReadOkAsync<IdDto>(response)).Id;
    }

    private static byte[] Jpeg()
    {
        using var image = new MagickImage(
            new MagickColor((byte)Random.Shared.Next(256), (byte)Random.Shared.Next(256), (byte)Random.Shared.Next(256)),
            400,
            600);
        return image.ToByteArray(MagickFormat.Jpeg);
    }

    private sealed record ReadingDto(Guid Id, ResultDto Result, List<IdDto> Candidates, RefundOfDto? RefundOf);

    private sealed record ResultDto(string? Currency, string? Total, DateOnly? Date, bool IsReturn);

    private sealed record RefundOfDto(Guid Id, DateOnly Date, string? Description);
}
