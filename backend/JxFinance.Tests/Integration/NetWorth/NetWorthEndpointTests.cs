using System.Net.Http.Json;
using JxFinance.Endpoints.NetWorth.Interfaces;
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
            Services.GetRequiredService<INetWorthSnapshotter>(),
            NullLogger<NetWorthSnapshotJob>.Instance);
        await job.RunOnceAsync(default);

        var responses = await Task.WhenAll(member.GetAsync("/api/networth"), member.GetAsync("/api/networth"));
        Assert.All(responses, r => r.EnsureSuccessStatusCode());

        var history = await member.GetFromJsonAsync<NetWorthHistoryDto>("/api/networth/history");
        Assert.NotEmpty(history!.Items);
        Assert.All(history.Items.GroupBy(i => i.Date), day => Assert.Single(day));
    }

    [Fact]
    public async Task One_user_whose_snapshot_fails_does_not_stop_the_others()
    {
        var users = new List<TestUser>();
        for (var i = 0; i < 5; i++)
        {
            users.Add(await CreateUserAsync());
        }

        users.Sort((a, b) => string.CompareOrdinal(a.Id.ToString(), b.Id.ToString()));
        var failing = users[0];
        var healthy = new List<HttpClient>();
        try
        {
            foreach (var user in users.Skip(1))
            {
                var client = await LoginAsync(user);
                healthy.Add(client);
                await CreateAccountAsync("25.00", client: client);
            }

            var snapshotter = new FailingSnapshotter(failing.Id, Services.GetRequiredService<INetWorthSnapshotter>());
            var job = new NetWorthSnapshotJob(
                Services.GetRequiredService<IServiceScopeFactory>(),
                snapshotter,
                NullLogger<NetWorthSnapshotJob>.Instance);

            await job.RunOnceAsync(default);

            Assert.True(snapshotter.Failed);
            foreach (var client in healthy)
            {
                var history = await client.GetFromJsonAsync<NetWorthHistoryDto>("/api/networth/history");
                Assert.Equal("25.00", Assert.Single(history!.Items).NetWorth);
            }
        }
        finally
        {
            healthy.ForEach(client => client.Dispose());
        }
    }

    [Fact]
    public async Task Totals_beyond_the_stored_range_are_answered_in_full_and_not_stored()
    {
        using var member = await CreateUserClientAsync();
        for (var i = 0; i < 2; i++)
        {
            await PostAsync<IdDto>(
                member,
                "/api/assets",
                new { name = $"Oversized {i}", type = "other", currentValue = "9999999999999999.99", asOf = Today });
        }

        var response = await member.GetAsync("/api/networth");

        response.EnsureSuccessStatusCode();
        Assert.Equal(
            new NetWorthDto("0.00", "19999999999999999.98", "0.00", "19999999999999999.98"),
            await response.Content.ReadFromJsonAsync<NetWorthDto>());
        Assert.Empty((await member.GetFromJsonAsync<NetWorthHistoryDto>("/api/networth/history"))!.Items);

        var debt = await PostAsync<IdDto>(
            member,
            "/api/debts",
            new { name = "Offsetting", type = "loan", outstandingAmount = "9999999999999999.99", asOf = Today });
        Assert.Equal("9999999999999999.99", (await member.GetFromJsonAsync<NetWorthDto>("/api/networth"))!.NetWorth);
        Assert.Empty((await member.GetFromJsonAsync<NetWorthHistoryDto>("/api/networth/history"))!.Items);

        (await member.DeleteAsync($"/api/debts/{debt.Id}")).EnsureSuccessStatusCode();
        foreach (var asset in (await member.GetFromJsonAsync<List<IdDto>>("/api/assets"))!.Skip(1))
        {
            (await member.DeleteAsync($"/api/assets/{asset.Id}")).EnsureSuccessStatusCode();
        }

        Assert.Equal("9999999999999999.99", (await member.GetFromJsonAsync<NetWorthDto>("/api/networth"))!.NetWorth);
        Assert.Equal("9999999999999999.99", Assert.Single((await member.GetFromJsonAsync<NetWorthHistoryDto>("/api/networth/history"))!.Items).NetWorth);
    }

    private sealed class FailingSnapshotter(Guid failingUserId, INetWorthSnapshotter inner) : INetWorthSnapshotter
    {
        public bool Failed { get; private set; }

        public Task SnapshotAsync(Guid userId, CancellationToken cancellationToken)
        {
            if (userId != failingUserId)
            {
                return inner.SnapshotAsync(userId, cancellationToken);
            }

            Failed = true;
            throw new InvalidOperationException("Snapshot failed.");
        }
    }

    private sealed record NetWorthDto(string Accounts, string Assets, string Debts, string NetWorth);

    private sealed record NetWorthSnapshotItemDto(DateOnly Date, string NetWorth);

    private sealed record NetWorthHistoryDto(List<NetWorthSnapshotItemDto> Items);
}
