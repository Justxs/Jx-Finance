using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using FastEndpoints.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace JxFinance.Tests.Integration;

[Collection<IntegrationCollection>]
public sealed class SharingAndJobRegressionTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private static string Id(JsonObject row) => row["id"]!.GetValue<string>();
    private static async Task<JsonObject> Post(HttpClient client, string path, object value)
    {
        var response = await client.PostAsJsonAsync(path, value);
        Assert.True(response.IsSuccessStatusCode, $"{path}: {response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<JsonObject>())!;
    }
    private async Task<(HttpClient Client, JsonObject User)> Member(string role = "Member")
    {
        var email = $"sharing-{Guid.NewGuid():N}@localhost";
        const string password = "Sharing-Regression-123!";
        var user = await Post(Client, "/api/users", new { email, password, role, displayName = "Sharing test" });
        var client = CreateClient(new ClientOptions { HandleCookies = true, AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Add("X-Forwarded-For", Guid.NewGuid().ToString());
        await Post(client, "/api/auth/login", new { email, password });
        return (client, user);
    }
    private Task<JsonObject> Account(string? householdId = null) => Post(Client, "/api/accounts", new {
        name = "Scope test", type = "checking", startingBalance = "100.00", scope = householdId is null ? "personal" : "shared", householdId });

    [Fact]
    public async Task Rescoping_revokes_access_to_history_even_for_its_author()
    {
        var (member, user) = await Member();
        using var dispose = member;
        var household = await Post(Client, "/api/households", new { name = "Rescope" });
        await Post(Client, $"/api/households/{Id(household)}/members", new { email = user["email"]!.GetValue<string>(), role = "member" });
        var account = await Account(Id(household));
        var transaction = await Post(member, "/api/transactions", new { accountId = Id(account), type = "expense", amount = "10.00", date = "2026-09-01" });
        var forbidden = await member.PutAsJsonAsync($"/api/accounts/{Id(account)}", new { name = "Take private", type = "checking", startingBalance = "100.00", scope = "personal" });
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        (await Client.PutAsJsonAsync($"/api/accounts/{Id(account)}", new { name = "Now personal", type = "checking", startingBalance = "100.00", scope = "personal" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound, (await member.GetAsync($"/api/transactions/{Id(transaction)}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await member.DeleteAsync($"/api/transactions/{Id(transaction)}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync($"/api/transactions/{Id(transaction)}")).StatusCode);
    }

    [Fact]
    public async Task Removed_member_loses_shared_history_and_cannot_delete_a_mixed_scope_transfer()
    {
        var (member, user) = await Member();
        using var dispose = member;
        var household = await Post(Client, "/api/households", new { name = "Removal" });
        await Post(Client, $"/api/households/{Id(household)}/members", new { email = user["email"]!.GetValue<string>(), role = "member" });
        var shared = await Account(Id(household));
        var personal = await Account();
        var transfer = await Post(Client, "/api/transfers", new { fromAccountId = Id(personal), toAccountId = Id(shared), amount = "20.00", date = "2026-09-01" });
        Assert.Equal(HttpStatusCode.Forbidden, (await member.DeleteAsync($"/api/transfers/{Id(transfer)}")).StatusCode);
        var transaction = await Post(member, "/api/transactions", new { accountId = Id(shared), type = "expense", amount = "5.00", date = "2026-09-01" });
        (await Client.DeleteAsync($"/api/households/{Id(household)}/members/{Id(user)}")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound, (await member.GetAsync($"/api/accounts/{Id(shared)}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await member.GetAsync($"/api/transactions/{Id(transaction)}")).StatusCode);
        var remaining = await Client.GetFromJsonAsync<JsonObject>($"/api/accounts/{Id(shared)}");
        Assert.Equal("115.00", remaining!["currentBalance"]!.GetValue<string>());
    }

    [Fact]
    public async Task Role_change_revokes_the_old_admin_session()
    {
        var (admin, user) = await Member("Admin");
        using var dispose = admin;
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/users")).StatusCode);
        (await Client.PutAsJsonAsync($"/api/users/{Id(user)}/role", new { role = "Member" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await admin.GetAsync("/api/users")).StatusCode);
    }

    [Fact]
    public async Task Concurrent_reminder_scans_create_one_notification_and_confirm_marks_it_read()
    {
        var account = await Account();
        var bill = await Post(Client, "/api/recurring-bills", new { name = "Deduplicated reminder", kind = "fixed", amount = "5.00", accountId = Id(account), cadence = "monthly", nextDueDate = "2026-01-01" });
        var scopes = Services.GetRequiredService<IServiceScopeFactory>();
        var job = new RecurringBillReminderJob(scopes, NullLogger<RecurringBillReminderJob>.Instance);
        await Task.WhenAll(job.ScanAsync(default), job.ScanAsync(default));
        var notifications = await Client.GetFromJsonAsync<JsonArray>("/api/notifications?unread=true");
        Assert.Single(notifications!, n => n!["relatedId"]?.GetValue<string>() == Id(bill));
        await Post(Client, $"/api/recurring-bills/{Id(bill)}/confirm", new { expectedDueDate = "2026-01-01" });
        notifications = await Client.GetFromJsonAsync<JsonArray>("/api/notifications?unread=true");
        Assert.DoesNotContain(notifications!, n => n!["relatedId"]?.GetValue<string>() == Id(bill));
    }

    [Fact]
    public async Task Scheduled_snapshot_and_concurrent_views_keep_one_point_per_day()
    {
        var scopes = Services.GetRequiredService<IServiceScopeFactory>();
        var job = new NetWorthSnapshotJob(scopes, NullLogger<NetWorthSnapshotJob>.Instance);
        await job.RunOnceAsync(default);
        var responses = await Task.WhenAll(Client.GetAsync("/api/networth"), Client.GetAsync("/api/networth"));
        Assert.All(responses, r => r.EnsureSuccessStatusCode());
        var history = await Client.GetFromJsonAsync<JsonObject>("/api/networth/history");
        var points = history!["items"]!.AsArray();
        Assert.NotEmpty(points);
        Assert.All(points.GroupBy(p => p!["date"]!.GetValue<string>()), group => Assert.Single(group));
    }

    [Fact]
    public async Task Inactive_bills_and_inaccessible_references_are_rejected()
    {
        var invalid = await Client.PostAsJsonAsync("/api/recurring-bills", new { name = "Invalid", kind = "fixed", amount = "5.00", accountId = Guid.NewGuid(), cadence = "monthly", nextDueDate = "2026-09-01" });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        var bill = await Post(Client, "/api/recurring-bills", new { name = "Inactive", kind = "fixed", amount = "5.00", cadence = "monthly", nextDueDate = "2026-09-01" });
        (await Client.PutAsJsonAsync($"/api/recurring-bills/{Id(bill)}", new { name = "Inactive", kind = "fixed", amount = "5.00", cadence = "monthly", nextDueDate = "2026-09-01", isActive = false })).EnsureSuccessStatusCode();
        var response = await Client.PostAsJsonAsync($"/api/recurring-bills/{Id(bill)}/confirm", new { expectedDueDate = "2026-09-01" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
