using System.Net;
using System.Net.Http.Json;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace JxFinance.Tests.Integration.RecurringBills;

[Collection<IntegrationCollection>]
public sealed class RecurringBillEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Create_a_fixed_bill_requires_an_amount()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/recurring-bills",
            new
            {
                name = $"Rent {Guid.NewGuid():N}",
                kind = "fixed",
                cadence = "monthly",
                nextDueDate = "2026-08-01",
                remindDaysBefore = 3,
            }, TestContext.Current.CancellationToken);
        await AssertValidationErrorAsync(response, "amount");
    }

    [Fact]
    public async Task Create_a_variable_bill_rejects_an_upfront_amount()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/recurring-bills",
            new
            {
                name = $"Electricity {Guid.NewGuid():N}",
                kind = "variable",
                amount = "40.00",
                cadence = "monthly",
                nextDueDate = "2026-08-01",
                remindDaysBefore = 3,
            }, TestContext.Current.CancellationToken);
        await AssertValidationErrorAsync(response, "amount");
    }

    [Fact]
    public async Task Create_get_update_and_delete_a_fixed_bill()
    {
        var created = await CreateFixedBillAsync("Internet", "20.00", "2026-08-01");
        Assert.Equal("20.00", created.Amount);
        Assert.Equal("monthly", created.Cadence);
        Assert.True(created.IsActive);

        var fetched = await Client.GetFromJsonAsync<RecurringBillDto>($"/api/recurring-bills/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(created.Id, fetched!.Id);

        var listed = await Client.GetFromJsonAsync<List<RecurringBillDto>>("/api/recurring-bills", TestContext.Current.CancellationToken);
        Assert.Contains(listed!, b => b.Id == created.Id);

        var updateResponse = await Client.PutAsJsonAsync(
            $"/api/recurring-bills/{created.Id}",
            new
            {
                id = created.Id,
                name = "Internet & TV",
                kind = "fixed",
                amount = "25.00",
                cadence = "monthly",
                nextDueDate = "2026-08-01",
                remindDaysBefore = 5,
                isActive = false,
            }, TestContext.Current.CancellationToken);
        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<RecurringBillDto>(TestContext.Current.CancellationToken);
        Assert.Equal("Internet & TV", updated!.Name);
        Assert.Equal("25.00", updated.Amount);
        Assert.False(updated.IsActive);

        var deleteResponse = await Client.DeleteAsync($"/api/recurring-bills/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await Client.GetAsync($"/api/recurring-bills/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, afterDelete.StatusCode);
    }

    [Fact]
    public async Task Confirming_a_fixed_bill_creates_a_transaction_and_advances_the_due_date()
    {
        var account = await CreateAccountAsync("500.00");
        var created = await CreateFixedBillAsync("Gym", "30.00", "2026-08-01", account);

        var confirmResponse = await Client.PostAsJsonAsync(
            $"/api/recurring-bills/{created.Id}/confirm",
            new { expectedDueDate = created.NextDueDate }, TestContext.Current.CancellationToken);
        confirmResponse.EnsureSuccessStatusCode();
        var confirmed = await confirmResponse.Content.ReadFromJsonAsync<ConfirmDto>(TestContext.Current.CancellationToken);
        Assert.NotEqual(Guid.Empty, confirmed!.TransactionId);
        Assert.Equal("2026-09-01", confirmed.Bill.NextDueDate.ToString("yyyy-MM-dd"));

        var transaction = await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{confirmed.TransactionId}", TestContext.Current.CancellationToken);
        Assert.Equal("30.00", transaction!.Amount);
        Assert.Equal("expense", transaction.Type);
    }

    [Fact]
    public async Task Confirming_a_variable_bill_without_an_amount_fails()
    {
        var created = await CreateVariableBillAsync("Groceries", "2026-08-01");

        var response = await Client.PostAsJsonAsync($"/api/recurring-bills/{created.Id}/confirm", new { expectedDueDate = created.NextDueDate }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Concurrent_confirmations_post_one_occurrence()
    {
        var account = await CreateAccountAsync("100.00");
        var bill = await CreateFixedBillAsync("Once", "10.00", "2026-09-01", account);
        var path = $"/api/recurring-bills/{bill.Id}/confirm";
        var body = new { expectedDueDate = bill.NextDueDate };

        var responses = await Task.WhenAll(Client.PostAsJsonAsync(path, body, TestContext.Current.CancellationToken), Client.PostAsJsonAsync(path, body, TestContext.Current.CancellationToken));

        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Conflict);
        Assert.Equal("90.00", await CurrentBalanceAsync(account));
    }

    [Fact]
    public async Task Confirming_an_inactive_bill_fails()
    {
        var bill = await CreateFixedBillAsync("Inactive", "5.00", "2026-09-01");
        var deactivate = await Client.PutAsJsonAsync(
            $"/api/recurring-bills/{bill.Id}",
            new { name = bill.Name, kind = "fixed", amount = "5.00", cadence = "monthly", nextDueDate = bill.NextDueDate, isActive = false }, TestContext.Current.CancellationToken);
        deactivate.EnsureSuccessStatusCode();

        var response = await Client.PostAsJsonAsync($"/api/recurring-bills/{bill.Id}/confirm", new { expectedDueDate = bill.NextDueDate }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_rejects_an_account_the_caller_cannot_see()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/recurring-bills",
            new { name = "Invalid", kind = "fixed", amount = "5.00", accountId = Guid.NewGuid(), cadence = "monthly", nextDueDate = "2026-09-01" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Concurrent_reminder_scans_notify_once_and_confirming_marks_the_reminder_read()
    {
        var account = await CreateAccountAsync("100.00");
        var bill = await CreateFixedBillAsync("Reminder", "5.00", "2026-01-01", account);
        var job = new RecurringBillReminderJob(
            Services.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<RecurringBillReminderJob>.Instance);

        await Task.WhenAll(job.ScanAsync(TestContext.Current.CancellationToken), job.ScanAsync(TestContext.Current.CancellationToken));

        Assert.Single(await UnreadRemindersAsync(bill.Id));

        await PostAsync<ConfirmDto>(Client, $"/api/recurring-bills/{bill.Id}/confirm", new { expectedDueDate = bill.NextDueDate });

        Assert.Empty(await UnreadRemindersAsync(bill.Id));
    }

    [Theory]
    [InlineData(3, 3, true)]
    [InlineData(4, 3, false)]
    [InlineData(-1, 0, true)]
    public async Task Reminder_is_sent_only_inside_the_reminder_window(int dueInDays, int remindDaysBefore, bool expected)
    {
        var bill = await PostAsync<RecurringBillDto>(
            Client,
            "/api/recurring-bills",
            new { name = $"Window {Guid.NewGuid():N}", kind = "fixed", amount = "5.00", cadence = "monthly", nextDueDate = Today.AddDays(dueInDays), remindDaysBefore });
        var job = new RecurringBillReminderJob(
            Services.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<RecurringBillReminderJob>.Instance);

        await job.ScanAsync(TestContext.Current.CancellationToken);

        Assert.Equal(expected, (await UnreadRemindersAsync(bill.Id)).Count == 1);
    }

    private async Task<List<NotificationDto>> UnreadRemindersAsync(Guid billId)
    {
        var unread = await Client.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unread=true");
        return unread!.Where(n => n.RelatedId == billId).ToList();
    }

    private async Task<RecurringBillDto> CreateFixedBillAsync(
        string name,
        string amount,
        string nextDueDate,
        Guid? accountId = null)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/recurring-bills",
            new
            {
                name = $"{name} {Guid.NewGuid():N}",
                kind = "fixed",
                amount,
                accountId,
                cadence = "monthly",
                nextDueDate,
                remindDaysBefore = 3,
            });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<RecurringBillDto>())!;
    }

    private async Task<RecurringBillDto> CreateVariableBillAsync(string name, string nextDueDate)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/recurring-bills",
            new
            {
                name = $"{name} {Guid.NewGuid():N}",
                kind = "variable",
                cadence = "monthly",
                nextDueDate,
                remindDaysBefore = 3,
            });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<RecurringBillDto>())!;
    }

    private sealed record NotificationDto(Guid Id, Guid? RelatedId);

    private sealed record RecurringBillDto(
        Guid Id,
        string Name,
        string Kind,
        string? Amount,
        Guid? CategoryId,
        Guid? AccountId,
        string Cadence,
        DateOnly NextDueDate,
        int RemindDaysBefore,
        bool IsActive);

    private sealed record ConfirmDto(RecurringBillDto Bill, Guid TransactionId);
}
