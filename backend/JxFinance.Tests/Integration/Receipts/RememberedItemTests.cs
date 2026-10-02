using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ImageMagick;
using JxFinance.Common.Errors;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Receipts;
using JxFinance.Tests.Support;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Receipts;

[Collection<IntegrationCollection>]
public sealed class RememberedItemTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private FakeReceiptReader Reader => Services.GetRequiredService<FakeReceiptReader>();

    [Fact]
    public async Task The_search_is_normalized_like_the_key()
    {
        var member = await CreateUserAsync();
        using var client = await LoginAsync(member);
        var food = await FoodAsync(client);
        await RememberAsync(member.Id, food, "dantu pasta colgate", "pienas", "suris dziugas");

        var found = await ListAsync(client, "DANTŲ  Pasta 75 ml");

        Assert.Equal(["dantu pasta colgate"], found.Items.Select(i => i.Key));
        Assert.Equal(1, found.Total);
        Assert.Equal(food, found.Items[0].CategoryId);
        Assert.Equal(3, (await ListAsync(client)).Total);
    }

    [Fact]
    public async Task At_most_one_hundred_most_recently_used_are_listed_with_the_total()
    {
        var member = await CreateUserAsync();
        using var client = await LoginAsync(member);
        await RememberAsync(member.Id, await FoodAsync(client), Enumerable.Range(0, 105).Select(i => $"item {i:000}").ToArray());
        await SqlAsync($"""
            UPDATE "ReceiptItemCategories"
            SET "UpdatedAt" = timestamptz '2026-09-01 00:00:00+00' + substring("Key" from 6)::int * interval '1 minute'
            WHERE "UserId" = {member.Id}
            """);

        var listed = await ListAsync(client);

        Assert.Equal(105, listed.Total);
        Assert.Equal(100, listed.Items.Count);
        Assert.Equal("item 104", listed.Items[0].Key);
        Assert.Equal("item 005", listed.Items[^1].Key);
        Assert.Equal(listed.Items.Select(i => i.LastUsed).OrderDescending(), listed.Items.Select(i => i.LastUsed));
    }

    [Fact]
    public async Task Another_members_entry_is_neither_listed_nor_forgotten()
    {
        var owner = await CreateUserAsync();
        using var ownerClient = await LoginAsync(owner);
        using var stranger = await CreateUserClientAsync();
        await RememberAsync(owner.Id, await FoodAsync(ownerClient), "pienas");
        var entry = Assert.Single((await ListAsync(ownerClient)).Items);

        Assert.Empty((await ListAsync(stranger)).Items);
        await AssertProblemAsync(
            await stranger.DeleteAsync($"/api/receipts/item-categories/{entry.Id}", TestContext.Current.CancellationToken),
            HttpStatusCode.NotFound,
            ErrorCodes.ResourceNotFound);
        Assert.Single((await ListAsync(ownerClient)).Items);
    }

    [Fact]
    public async Task The_list_answers_feature_disabled_while_receipt_reading_is_off_and_refuses_a_long_search()
    {
        using var member = await CreateUserClientAsync();

        await AssertValidationErrorAsync(
            await member.GetAsync($"/api/receipts/item-categories?search={new string('a', 101)}", TestContext.Current.CancellationToken),
            "search");
        await using var off = await FeatureOffAsync("receiptReading");
        await AssertProblemAsync(
            await member.GetAsync("/api/receipts/item-categories", TestContext.Current.CancellationToken),
            HttpStatusCode.NotFound,
            ErrorCodes.FeatureDisabled);
    }

    [Fact]
    public async Task A_forgotten_item_falls_back_to_none_until_it_is_filed_again()
    {
        Reader.Reset();
        using var member = await CreateUserClientAsync();
        var bakery = await Seed.CategoryAsync(member, "Bakery");
        var reading = await ReadAsync(member);
        await FileAsync(member, reading, bakery);
        var entry = Assert.Single((await ListAsync(member, "duona")).Items);
        Assert.Equal(("duona bociu", bakery), (entry.Key, entry.CategoryId));

        Assert.Equal(HttpStatusCode.NoContent, (await member.DeleteAsync($"/api/receipts/item-categories/{entry.Id}", TestContext.Current.CancellationToken)).StatusCode);

        Assert.Empty((await ListAsync(member, "duona")).Items);
        await AssertProblemAsync(
            await member.DeleteAsync($"/api/receipts/item-categories/{entry.Id}", TestContext.Current.CancellationToken),
            HttpStatusCode.NotFound,
            ErrorCodes.ResourceNotFound);
        var next = await ReadAsync(member);
        Assert.Equal((null, false), (next.Result.Items[0].CategoryId, next.Result.Items[0].Remembered));

        await FileAsync(member, next, bakery);
        Assert.Equal(bakery, Assert.Single((await ListAsync(member, "duona")).Items).CategoryId);
        var again = await ReadAsync(member);
        Assert.Equal((bakery, true), (again.Result.Items[0].CategoryId, again.Result.Items[0].Remembered));
    }

    private Task RememberAsync(Guid userId, Guid categoryId, params string[] keys) =>
        WithDbAsync(userId, async db =>
        {
            db.ReceiptItemCategories.AddRange(keys.Select(key => new ReceiptItemCategory { UserId = userId, Key = key, CategoryId = new CategoryId(categoryId) }));
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });

    private static async Task<ListDto> ListAsync(HttpClient client, string? search = null) =>
        (await client.GetFromJsonAsync<ListDto>(
            search is null ? "/api/receipts/item-categories" : $"/api/receipts/item-categories?search={Uri.EscapeDataString(search)}",
            TestContext.Current.CancellationToken))!;

    private static async Task<Guid> FoodAsync(HttpClient client)
    {
        var all = await client.GetFromJsonAsync<List<NamedRow>>("/api/categories", TestContext.Current.CancellationToken);
        return all!.Single(c => c.Name == "Food").Id;
    }

    private static async Task<ReadingDto> ReadAsync(HttpClient client)
    {
        using var image = new MagickImage(
            new MagickColor((byte)Random.Shared.Next(256), (byte)Random.Shared.Next(256), (byte)Random.Shared.Next(256)),
            400,
            600);
        var part = new ByteArrayContent(image.ToByteArray(MagickFormat.Jpeg));
        part.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        var form = new MultipartFormDataContent { { part, "file", "receipt.jpg" } };
        return await ReadOkAsync<ReadingDto>(await client.PostAsync("/api/receipts/read", form, TestContext.Current.CancellationToken));
    }

    private static async Task FileAsync(HttpClient client, ReadingDto reading, Guid categoryId)
    {
        var saved = await client.PutAsJsonAsync(
            $"/api/receipts/{reading.Id}/categories",
            new { items = new object[] { new { index = 0, categoryId } } },
            TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, saved.StatusCode);
    }

    private sealed record ListDto(List<EntryDto> Items, int Total);

    private sealed record EntryDto(Guid Id, string Key, Guid CategoryId, DateTimeOffset LastUsed);

    private sealed record ReadingDto(Guid Id, ResultDto Result);

    private sealed record ResultDto(List<ItemDto> Items);

    private sealed record ItemDto(string Name, Guid? CategoryId, bool Remembered);
}
