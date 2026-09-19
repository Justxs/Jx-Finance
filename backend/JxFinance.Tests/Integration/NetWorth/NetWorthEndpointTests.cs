using System.Net.Http.Json;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace JxFinance.Tests.Integration.NetWorth;

[Collection<IntegrationCollection>]
public sealed class NetWorthEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Net_worth_combines_accounts_assets_and_debts()
    {
        using var member = await CreateUserClientAsync();
        await CreateAccountAsync("500.00", client: member);

        await PostAsync<IdDto>(
            member,
            "/api/assets",
            new { name = $"Car {Guid.NewGuid():N}", type = "vehicle", currentValue = "10000.00", asOf = Today });
        await PostAsync<IdDto>(
            member,
            "/api/debts",
            new { name = $"Car loan {Guid.NewGuid():N}", type = "loan", outstandingAmount = "4000.00", asOf = Today });

        var after = await member.GetFromJsonAsync<NetWorthDto>("/api/networth");
        Assert.Equal(new NetWorthDto("500.00", "10000.00", "4000.00", "6500.00"), after);

        var history = await member.GetFromJsonAsync<NetWorthHistoryDto>("/api/networth/history");
        Assert.Contains(history!.Items, i => i.Date == Today);
    }

    [Fact]
    public async Task Scheduled_snapshot_and_concurrent_views_keep_one_point_per_day()
    {
        using var member = await CreateUserClientAsync();
        var job = new NetWorthSnapshotJob(
            Services.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<NetWorthSnapshotJob>.Instance);
        await job.RunOnceAsync(default);

        var responses = await Task.WhenAll(member.GetAsync("/api/networth"), member.GetAsync("/api/networth"));
        Assert.All(responses, r => r.EnsureSuccessStatusCode());

        var history = await member.GetFromJsonAsync<NetWorthHistoryDto>("/api/networth/history");
        Assert.NotEmpty(history!.Items);
        Assert.All(history.Items.GroupBy(i => i.Date), day => Assert.Single(day));
    }

    private sealed record NetWorthDto(string Accounts, string Assets, string Debts, string NetWorth);

    private sealed record NetWorthSnapshotItemDto(DateOnly Date, string NetWorth);

    private sealed record NetWorthHistoryDto(List<NetWorthSnapshotItemDto> Items);
}
