using System.Net;
using System.Net.Http.Json;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.RecurringBills;

[Collection<ImportsCollection>]
public sealed class SkipRecurringBillTests(ImportsFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Marking_an_occurrence_done_advances_the_entry_without_writing_a_row()
    {
        var account = await CreateAccountAsync("500.00");
        var bill = await CreateBillAsync(Client, account, "2026-08-01");

        var skipped = await PostAsync<BillDto>(Client, SkipPath(bill.Id), new { expectedDueDate = "2026-08-01" });

        Assert.Equal(new DateOnly(2026, 9, 1), skipped.NextDueDate);
        Assert.Equal("500.00", await CurrentBalanceAsync(account));
    }

    [Fact]
    public async Task A_stale_or_repeated_mark_is_refused_and_advances_nothing()
    {
        var account = await CreateAccountAsync("500.00");
        var bill = await CreateBillAsync(Client, account, "2026-08-01");

        var wrongDate = await Client.PostAsJsonAsync(SkipPath(bill.Id), new { expectedDueDate = "2026-07-01" }, TestContext.Current.CancellationToken);
        var responses = await Task.WhenAll(
            Client.PostAsJsonAsync(SkipPath(bill.Id), new { expectedDueDate = "2026-08-01" }, TestContext.Current.CancellationToken),
            Client.PostAsJsonAsync(SkipPath(bill.Id), new { expectedDueDate = "2026-08-01" }, TestContext.Current.CancellationToken));
        var afterConfirm = await Client.PostAsJsonAsync(
            $"/api/recurring-bills/{bill.Id}/confirm",
            new { expectedDueDate = "2026-08-01" },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(wrongDate, HttpStatusCode.Conflict, "conflict.stale");
        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
        await AssertProblemAsync(Assert.Single(responses, r => r.StatusCode != HttpStatusCode.OK), HttpStatusCode.Conflict, "conflict.stale");
        await AssertProblemAsync(afterConfirm, HttpStatusCode.Conflict, "conflict.stale");
        Assert.Equal(new DateOnly(2026, 9, 1), (await BillAsync(Client, bill.Id)).NextDueDate);
        Assert.Equal("500.00", await CurrentBalanceAsync(account));
    }

    [Fact]
    public async Task An_inactive_entry_cannot_be_marked_done()
    {
        var bill = await CreateBillAsync(Client, null, "2026-08-01");
        (await Client.PutAsJsonAsync(
            $"/api/recurring-bills/{bill.Id}",
            new { name = bill.Name, kind = "fixed", amount = "30.00", cadence = "monthly", nextDueDate = "2026-08-01", isActive = false },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var response = await Client.PostAsJsonAsync(SkipPath(bill.Id), new { expectedDueDate = "2026-08-01" }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "recurringBill.inactive");
    }

    [Fact]
    public async Task Marking_done_reads_the_entry_reminders()
    {
        var bill = await CreateBillAsync(Client, null, "2026-01-01");
        await Job<RecurringBillReminderJob>().RunOnceAsync(TestContext.Current.CancellationToken);
        var before = await UnreadRemindersAsync(bill.Id);

        await PostAsync<BillDto>(Client, SkipPath(bill.Id), new { expectedDueDate = "2026-01-01" });

        Assert.Single(before);
        Assert.Empty(await UnreadRemindersAsync(bill.Id));
    }

    [Fact]
    public async Task A_household_member_marks_a_shared_entry_done()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync("500.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var bill = await CreateBillAsync(pair.OwnerClient, account, "2026-08-01", householdId: pair.HouseholdId);

        var skipped = await PostAsync<BillDto>(pair.PartnerClient, SkipPath(bill.Id), new { expectedDueDate = "2026-08-01" });

        Assert.Equal(new DateOnly(2026, 9, 1), skipped.NextDueDate);
        Assert.Equal(new DateOnly(2026, 9, 1), (await BillAsync(pair.OwnerClient, bill.Id)).NextDueDate);
        Assert.Equal("500.00", await CurrentBalanceAsync(account, pair.OwnerClient));
    }

    [Fact]
    public async Task The_matched_row_pays_the_entry_debt_once()
    {
        var account = await CreateAccountAsync("5000.00");
        var debt = (await PostAsync<IdDto>(Client, "/api/debts", new
        {
            name = "Car loan",
            type = "loan",
            outstandingAmount = "1000.00",
            asOf = "2026-05-01",
            tracksPayments = true,
        })).Id;
        var bill = await CreateBillAsync(Client, account, "2026-06-01", debt);
        var row = await CreateTransactionAsync(Client, account, null, "expense", "200.00", "2026-06-02", "Car loan");

        await PostAsync<BillDto>(Client, SkipPath(bill.Id), new { expectedDueDate = "2026-06-01", transactionId = row.Id });
        await PostAsync<BillDto>(Client, SkipPath(bill.Id), new { expectedDueDate = "2026-07-01", transactionId = row.Id });

        var payments = await Client.GetFromJsonAsync<List<PaymentDto>>($"/api/debts/{debt}/payments", TestContext.Current.CancellationToken);
        Assert.Equal(row.Id, Assert.Single(payments!).TransactionId);
        var debts = await Client.GetFromJsonAsync<List<DebtDto>>("/api/debts", TestContext.Current.CancellationToken);
        Assert.Equal("800.00", debts!.Single(d => d.Id == debt).TrackedBalance);
    }

    private static string SkipPath(Guid billId) => $"/api/recurring-bills/{billId}/skip";

    private static Task<BillDto> CreateBillAsync(
        HttpClient client,
        Guid? accountId,
        string nextDueDate,
        Guid? debtId = null,
        Guid? householdId = null) =>
        PostAsync<BillDto>(client, "/api/recurring-bills", new
        {
            name = $"Car loan {Guid.NewGuid():N}",
            shape = "expense",
            kind = "fixed",
            amount = "200.00",
            accountId,
            cadence = "monthly",
            nextDueDate,
            remindDaysBefore = 3,
            debtId,
            scope = householdId is null ? "personal" : "shared",
            householdId,
        });

    private static async Task<BillDto> BillAsync(HttpClient client, Guid billId) =>
        (await client.GetFromJsonAsync<BillDto>($"/api/recurring-bills/{billId}", TestContext.Current.CancellationToken))!;

    private async Task<List<NotificationDto>> UnreadRemindersAsync(Guid billId)
    {
        var unread = await Client.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unread=true", TestContext.Current.CancellationToken);
        return unread!.Where(n => n.RelatedId == billId).ToList();
    }

    private sealed record BillDto(Guid Id, string Name, DateOnly NextDueDate);

    private sealed record NotificationDto(Guid Id, Guid? RelatedId);

    private sealed record PaymentDto(Guid Id, Guid TransactionId);

    private sealed record DebtDto(Guid Id, string? TrackedBalance);
}
