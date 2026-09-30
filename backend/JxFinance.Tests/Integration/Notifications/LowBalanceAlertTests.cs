using System.Net.Http.Json;
using JxFinance.Domain.Notifications;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Notifications;

[Collection<IntegrationCollection>]
public sealed class LowBalanceAlertTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task An_account_forecast_to_go_below_zero_raises_one_alert_and_no_repeat()
    {
        using var member = await CreateUserClientAsync();
        var tight = await CreateAccountAsync("100.00", client: member);
        var comfortable = await CreateAccountAsync("5000.00", client: member);
        await Seed.RecurringBillAsync(member, Today.AddDays(5), "Rent", amount: "300.00", accountId: tight);
        await Seed.RecurringBillAsync(member, Today.AddDays(5), "Gym", amount: "30.00", accountId: comfortable);
        var job = Job<LowBalanceJob>();

        await job.RunOnceAsync(TestContext.Current.CancellationToken);
        await job.RunOnceAsync(TestContext.Current.CancellationToken);
        var alerts = await AlertsAsync(member);

        var alert = Assert.Single(alerts);
        Assert.Equal(("lowBalance", tight), (alert.Type, alert.RelatedId));
        Assert.Equal((Today.AddDays(5), "-200.00", "eur"), (alert.Payload.DueDate, alert.Payload.Amount, alert.Payload.Currency));
    }

    [Fact]
    public async Task An_account_already_below_zero_raises_nothing()
    {
        using var member = await CreateUserClientAsync();
        var overdrawn = await CreateAccountAsync("-50.00", client: member);
        await Seed.RecurringBillAsync(member, Today.AddDays(3), amount: "20.00", accountId: overdrawn);

        await Job<LowBalanceJob>().RunOnceAsync(TestContext.Current.CancellationToken);

        Assert.Empty(await AlertsAsync(member));
    }

    private static async Task<List<AlertDto>> AlertsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<AlertDto>>("/api/notifications", TestContext.Current.CancellationToken))!
            .Where(n => n.RelatedType == NotificationRelated.Account)
            .ToList();

    private sealed record AlertPayloadDto(DateOnly? DueDate, string? Amount, string? Currency);

    private sealed record AlertDto(Guid Id, string Type, string Title, AlertPayloadDto Payload, string? RelatedType, Guid? RelatedId);
}
