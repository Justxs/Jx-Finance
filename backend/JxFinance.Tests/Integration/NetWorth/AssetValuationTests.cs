using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.NetWorth;

[Collection<NetWorthCollection>]
public sealed class AssetValuationTests(NetWorthFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Creating_an_asset_writes_a_valuation_and_a_new_date_adds_another()
    {
        using var member = await CreateUserClientAsync();
        var asset = await PostAsync<AssetDto>(member, "/api/assets", Body("10000.00", Today.AddDays(-10)));
        Assert.Equal([new ValuationDto(Today.AddDays(-10), "10000.00", null)], await ValuationsAsync(member, asset.Id));

        var updated = await ReadOkAsync<AssetDto>(await member.PutAsJsonAsync($"/api/assets/{asset.Id}", Body("9000.00", Today), TestContext.Current.CancellationToken));

        Assert.Equal(("9000.00", Today), (updated.CurrentValue, updated.AsOf));
        Assert.Equal(
            [new ValuationDto(Today, "9000.00", null), new ValuationDto(Today.AddDays(-10), "10000.00", null)],
            await ValuationsAsync(member, asset.Id));
    }

    [Fact]
    public async Task Same_date_writes_replace_deleting_the_newest_falls_back_and_the_last_one_stays()
    {
        using var member = await CreateUserClientAsync();
        var asset = await PostAsync<AssetDto>(member, "/api/assets", Body("10000.00", Today.AddDays(-10)));
        var url = $"/api/assets/{asset.Id}/valuations/{Today.AddDays(-5):yyyy-MM-dd}";
        (await member.PutAsJsonAsync(url, new { value = "9500.00", note = "Dealer quote" }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var replaced = await ReadOkAsync<AssetDto>(await member.PutAsJsonAsync(url, new { value = "9400.00", note = " Inspection " }, TestContext.Current.CancellationToken));

        Assert.Equal("9400.00", replaced.CurrentValue);
        Assert.Equal(new ValuationDto(Today.AddDays(-5), "9400.00", "Inspection"), (await ValuationsAsync(member, asset.Id))[0]);

        Assert.Equal(HttpStatusCode.NoContent, (await member.DeleteAsync(url, TestContext.Current.CancellationToken)).StatusCode);
        var listed = Assert.Single((await member.GetFromJsonAsync<List<AssetDto>>("/api/assets", TestContext.Current.CancellationToken))!);
        Assert.Equal(("10000.00", Today.AddDays(-10)), (listed.CurrentValue, listed.AsOf));

        await AssertProblemAsync(
            await member.DeleteAsync($"/api/assets/{asset.Id}/valuations/{Today.AddDays(-10):yyyy-MM-dd}", TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "asset.lastValuation");
        Assert.Equal(HttpStatusCode.NotFound, (await member.DeleteAsync(url, TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task Future_dates_and_incomplete_or_impossible_depreciation_are_refused()
    {
        using var member = await CreateUserClientAsync();
        var asset = await PostAsync<AssetDto>(member, "/api/assets", Body("100.00", Today));

        await AssertValidationErrorAsync(await member.PostAsJsonAsync("/api/assets", Body("100.00", Today.AddDays(1)), TestContext.Current.CancellationToken), "asOf");
        await AssertValidationErrorAsync(
            await member.PutAsJsonAsync($"/api/assets/{asset.Id}/valuations/{Today.AddDays(1):yyyy-MM-dd}", new { value = "1.00" }, TestContext.Current.CancellationToken),
            "date");
        await AssertProblemAsync(
            await member.PostAsJsonAsync("/api/assets", Body("100.00", Today, new { startDate = Today, startValue = "100.00" }), TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "asset.depreciationIncomplete");
        await AssertValidationErrorAsync(
            await member.PostAsJsonAsync("/api/assets", Body("100.00", Today, Terms(Today, "100.00", 0, "0.00")), TestContext.Current.CancellationToken),
            "depreciation.lifeMonths");
        await AssertValidationErrorAsync(
            await member.PostAsJsonAsync("/api/assets", Body("100.00", Today, Terms(Today, "100.00", 12, "100.00")), TestContext.Current.CancellationToken),
            "depreciation.startValue");
        await AssertValidationErrorAsync(
            await member.PostAsJsonAsync("/api/assets", Body("100.00", Today, Terms(Today.AddDays(1), "100.00", 12, "0.00")), TestContext.Current.CancellationToken),
            "depreciation.startDate");
    }

    [Fact]
    public async Task Net_worth_the_list_the_history_and_the_snapshot_job_use_the_depreciated_value()
    {
        using var member = await CreateUserClientAsync();
        var start = Today.AddMonths(-3);
        var asset = await PostAsync<AssetDto>(member, "/api/assets", Body("12000.00", start, Terms(start, "12000.00", 12, "0.00")));

        await Job<NetWorthSnapshotJob>().RunOnceAsync(TestContext.Current.CancellationToken);
        var snapshot = Assert.Single((await member.GetFromJsonAsync<SnapshotsDto>("/api/networth/history", TestContext.Current.CancellationToken))!.Items);
        var listed = Assert.Single((await member.GetFromJsonAsync<List<AssetDto>>("/api/assets", TestContext.Current.CancellationToken))!);
        var history = (await member.GetFromJsonAsync<HistoryDto>($"/api/assets/{asset.Id}/value-history", TestContext.Current.CancellationToken))!;

        Assert.Equal("9000.00", snapshot.Assets);
        Assert.Equal("9000.00", (await member.GetFromJsonAsync<NetWorthDto>("/api/networth", TestContext.Current.CancellationToken))!.Assets);
        Assert.Equal(new AssetDto(asset.Id, "12000.00", start, "9000.00", "1000.00", start.AddMonths(12)), listed);
        Assert.Equal("eur", history.Currency);
        Assert.Equal(new PointDto(start, "12000.00", true), history.Points[0]);
        Assert.Equal(new PointDto(Today, "9000.00", false), history.Points[^1]);
        Assert.Equal(new PointDto(start.AddMonths(1), "11000.00", false), history.Points.Single(p => p.Date == start.AddMonths(1)));
    }

    [Fact]
    public async Task An_asset_counts_only_from_its_first_valuation()
    {
        using var member = await CreateUserClientAsync();
        var asset = await PostAsync<AssetDto>(member, "/api/assets", Body("500.00", Today));
        var later = Today.AddDays(5);
        var assetId = new AssetId(asset.Id);
        await WithDbAsync(async db =>
        {
            await db.AssetValuations.Where(v => v.AssetId == assetId).ExecuteUpdateAsync(s => s.SetProperty(v => v.Date, later), TestContext.Current.CancellationToken);
            await db.Assets.IgnoreQueryFilters().Where(a => a.Id == assetId).ExecuteUpdateAsync(s => s.SetProperty(a => a.AsOf, later), TestContext.Current.CancellationToken);
        });

        Assert.Equal("0.00", (await member.GetFromJsonAsync<NetWorthDto>("/api/networth", TestContext.Current.CancellationToken))!.Assets);
    }

    [Fact]
    public async Task Another_user_cannot_see_or_change_the_valuations()
    {
        using var owner = await CreateUserClientAsync();
        using var other = await CreateUserClientAsync();
        var asset = await PostAsync<AssetDto>(owner, "/api/assets", Body("100.00", Today));
        var url = $"/api/assets/{asset.Id}/valuations";

        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync(url, TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/assets/{asset.Id}/value-history", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PutAsJsonAsync($"{url}/{Today:yyyy-MM-dd}", new { value = "1.00" }, TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync($"{url}/{Today:yyyy-MM-dd}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal([new ValuationDto(Today, "100.00", null)], await ValuationsAsync(owner, asset.Id));
    }

    [Fact]
    public async Task The_trash_keeps_the_valuations_and_the_purge_removes_them()
    {
        using var member = await CreateUserClientAsync();
        var asset = await PostAsync<AssetDto>(member, "/api/assets", Body("100.00", Today.AddDays(-1)));
        (await member.PutAsJsonAsync($"/api/assets/{asset.Id}/valuations/{Today:yyyy-MM-dd}", new { value = "90.00" }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        (await member.DeleteAsync($"/api/assets/{asset.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await member.PostAsJsonAsync("/api/trash/restore", new { kind = "asset", entityId = asset.Id }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Equal(2, (await ValuationsAsync(member, asset.Id)).Count);

        (await member.DeleteAsync($"/api/assets/{asset.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var assetId = new AssetId(asset.Id);
        var old = DateTimeOffset.UtcNow.AddDays(-DeletionEntry.RetentionDays - 1);
        await WithDbAsync(db => db.Assets.IgnoreQueryFilters().Where(a => a.Id == assetId)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.UpdatedAt, old), TestContext.Current.CancellationToken));
        await Job<RetentionJob>().RunOnceAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, await WithDbAsync(db => db.AssetValuations.CountAsync(v => v.AssetId == assetId, TestContext.Current.CancellationToken)));
    }

    private static object Body(string currentValue, DateOnly asOf, object? depreciation = null) =>
        new { name = $"Asset {Guid.NewGuid():N}", type = "vehicle", currentValue, asOf, depreciation };

    private static object Terms(DateOnly startDate, string startValue, int lifeMonths, string residualValue) =>
        new { startDate, startValue, lifeMonths, residualValue };

    private static async Task<List<ValuationDto>> ValuationsAsync(HttpClient client, Guid assetId) =>
        (await client.GetFromJsonAsync<List<ValuationDto>>($"/api/assets/{assetId}/valuations", TestContext.Current.CancellationToken))!;

    private sealed record AssetDto(Guid Id, string CurrentValue, DateOnly AsOf, string Value, string? MonthlyDepreciation, DateOnly? FullyDepreciatedOn);

    private sealed record ValuationDto(DateOnly Date, string Value, string? Note);

    private sealed record NetWorthDto(string Assets);

    private sealed record SnapshotsDto(List<NetWorthDto> Items);

    private sealed record PointDto(DateOnly Date, string Value, bool IsValuation);

    private sealed record HistoryDto(string Currency, List<PointDto> Points);
}
