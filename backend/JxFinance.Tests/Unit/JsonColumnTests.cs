using System.Text.Json;
using System.Text.Json.Nodes;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Dashboard;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Unit;

public sealed class JsonColumnTests
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task Audit_changes_reach_the_column_as_web_shaped_json()
    {
        await using var capture = new SqlCapture();
        List<AuditChange> changes = [new("Name", "Old", "New"), new("Note", null, "Set")];

        await capture.Db.AuditEvents
            .Where(e => e.Description == "Everyday")
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(e => e.Changes, changes),
                TestContext.Current.CancellationToken);

        AssertSameJson(JsonSerializer.Serialize(changes, Web), OnlyJson(capture));
    }

    [Fact]
    public async Task A_dashboard_layout_reaches_the_column_as_web_shaped_json()
    {
        await using var capture = new SqlCapture();
        var layout = DashboardLayout.From([DashboardCard.Accounts, DashboardCard.Summary], [DashboardCard.NetWorth]);

        await capture.Db.Users
            .Where(u => u.Id == Guid.Empty)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(u => u.DashboardLayout, layout),
                TestContext.Current.CancellationToken);

        AssertSameJson(JsonSerializer.Serialize(layout, Web), OnlyJson(capture));
    }

    [Fact]
    public async Task A_dashboard_layout_is_read_from_its_own_column()
    {
        await using var capture = new SqlCapture();

        await capture.Db.Users
            .Where(u => u.Id == Guid.Empty)
            .Select(u => u.DashboardLayout)
            .FirstOrDefaultAsync(TestContext.Current.CancellationToken);

        Assert.Contains("\"DashboardLayout\"", capture.OnlyStatement, StringComparison.Ordinal);
    }

    private static void AssertSameJson(string expected, string actual) =>
        Assert.True(
            JsonNode.DeepEquals(JsonNode.Parse(expected), JsonNode.Parse(actual)),
            $"Expected {expected} but the column received {actual}.");

    private static string OnlyJson(SqlCapture capture) =>
        Assert.Single(
            capture.Values.OfType<string>(),
            value => value.StartsWith('[') || value.StartsWith('{'));
}
