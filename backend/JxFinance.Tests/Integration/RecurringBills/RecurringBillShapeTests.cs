using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.Notifications;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace JxFinance.Tests.Integration.RecurringBills;

[Collection<IntegrationCollection>]
public sealed class RecurringBillShapeTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Confirming_an_income_entry_creates_an_income_transaction()
    {
        var account = await CreateAccountAsync("100.00");
        var category = await CreateCategoryAsync("income");
        var entry = await CreateEntryAsync("income", "250.00", accountId: account, categoryId: category);

        var confirmed = await ConfirmOkAsync(entry);
        Assert.NotNull(confirmed.TransactionId);
        Assert.Null(confirmed.TransferId);
        Assert.Equal("2026-09-01", confirmed.Bill.NextDueDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));

        var transaction = await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{confirmed.TransactionId}", TestContext.Current.CancellationToken);
        Assert.Equal("income", transaction!.Type);
        Assert.Equal("250.00", transaction.Amount);
        Assert.Equal(category, transaction.CategoryId);
        Assert.Equal("350.00", await CurrentBalanceAsync(account));
    }

    [Fact]
    public async Task Confirming_an_entry_books_it_in_the_currency_of_the_paying_account()
    {
        var dollars = await CreateAccountAsync("500.00", currency: "usd");
        var entry = await CreateEntryAsync("expense", "110.00", accountId: dollars);

        var confirmed = await ConfirmOkAsync(entry);

        var transaction = await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{confirmed.TransactionId}", TestContext.Current.CancellationToken);
        Assert.Equal("usd", transaction!.Currency);
        Assert.Equal("110.00", transaction.Amount);
        Assert.Equal("100.00", transaction.ReportingAmount);
        Assert.Equal("390.00", await CurrentBalanceAsync(dollars));
    }

    [Fact]
    public async Task Confirming_an_entry_on_an_account_in_a_disabled_currency_is_refused()
    {
        var pounds = await CreateAccountAsync("500.00", currency: "gbp");
        var entry = await CreateEntryAsync("expense", "40.00", accountId: pounds);
        await using (await OnlyCurrenciesAsync("usd"))
        {
            var response = await ConfirmAsync(entry.Id, new { expectedDueDate = entry.NextDueDate });

            await AssertRejectedAsync(response, "currency.disabled");
        }

        Assert.Equal("500.00", await CurrentBalanceAsync(pounds));
    }

    [Fact]
    public async Task An_income_entry_refuses_an_expense_category()
    {
        var account = await CreateAccountAsync("100.00");
        var category = await CreateCategoryAsync();

        var response = await Client.PostAsJsonAsync("/api/recurring-bills", Body("income", "10.00", account, null, category), TestContext.Current.CancellationToken);

        await AssertRejectedAsync(response, "category.wrongType");
    }

    [Fact]
    public async Task Confirming_a_transfer_entry_creates_a_transfer()
    {
        var from = await CreateAccountAsync("500.00");
        var to = await CreateAccountAsync("100.00");
        var entry = await CreateEntryAsync("transfer", "120.00", accountId: from, toAccountId: to);

        var confirmed = await ConfirmOkAsync(entry);
        Assert.Null(confirmed.TransactionId);
        Assert.NotNull(confirmed.TransferId);

        var transfer = await TransferAsync(entry.NextDueDate, confirmed.TransferId);
        Assert.Equal(from, transfer.FromAccountId);
        Assert.Equal(to, transfer.ToAccountId);
        Assert.Equal("120.00", transfer.Amount);
        Assert.Equal("120.00", transfer.ReceivedAmount);
        Assert.Equal(entry.Name, transfer.Description);
        Assert.Equal("380.00", await CurrentBalanceAsync(from));
        Assert.Equal("220.00", await CurrentBalanceAsync(to));
    }

    [Fact]
    public async Task Confirming_a_transfer_between_currencies_uses_the_received_amount()
    {
        var euros = await CreateAccountAsync("500.00");
        var dollars = await CreateAccountAsync("100.00", currency: "usd");
        var entry = await CreateEntryAsync("transfer", "100.00", accountId: euros, toAccountId: dollars);

        var confirmed = await ConfirmOkAsync(entry, new { expectedDueDate = entry.NextDueDate, receivedAmount = "110.00" });

        var transfer = await TransferAsync(entry.NextDueDate, confirmed.TransferId);
        Assert.Equal("eur", transfer.Currency);
        Assert.Equal("100.00", transfer.Amount);
        Assert.Equal("usd", transfer.ReceivedCurrency);
        Assert.Equal("110.00", transfer.ReceivedAmount);
        Assert.Equal("400.00", await CurrentBalanceAsync(euros));
        Assert.Equal("210.00", await CurrentBalanceAsync(dollars));
    }

    [Fact]
    public async Task Confirming_a_transfer_between_currencies_needs_the_received_amount()
    {
        var euros = await CreateAccountAsync("500.00");
        var dollars = await CreateAccountAsync("100.00", currency: "usd");
        var entry = await CreateEntryAsync("transfer", "100.00", accountId: euros, toAccountId: dollars);

        var response = await ConfirmAsync(entry.Id, new { expectedDueDate = entry.NextDueDate });

        await AssertRejectedAsync(response, "transfer.receivedAmountRequired");
        Assert.Equal("500.00", await CurrentBalanceAsync(euros));
        var unchanged = await Client.GetFromJsonAsync<EntryDto>($"/api/recurring-bills/{entry.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(entry.NextDueDate, unchanged!.NextDueDate);
    }

    [Theory]
    [InlineData("expense")]
    [InlineData("income")]
    [InlineData("transfer")]
    public async Task A_stale_confirmation_is_refused_for_every_shape(string shape)
    {
        var entry = await CreateOfShapeAsync(shape);

        var stale = await ConfirmAsync(entry.Id, new { expectedDueDate = entry.NextDueDate.AddDays(-1) });

        await AssertProblemAsync(stale, HttpStatusCode.Conflict, "conflict.stale");
        var unchanged = await Client.GetFromJsonAsync<EntryDto>($"/api/recurring-bills/{entry.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(entry.NextDueDate, unchanged!.NextDueDate);
    }

    [Theory]
    [InlineData("expense")]
    [InlineData("income")]
    [InlineData("transfer")]
    public async Task An_inactive_entry_of_any_shape_cannot_be_confirmed(string shape)
    {
        var entry = await CreateOfShapeAsync(shape);
        var deactivate = await Client.PutAsJsonAsync(
            $"/api/recurring-bills/{entry.Id}",
            new
            {
                id = entry.Id,
                name = entry.Name,
                shape,
                kind = "fixed",
                amount = entry.Amount,
                categoryId = entry.CategoryId,
                accountId = entry.AccountId,
                toAccountId = entry.ToAccountId,
                cadence = "monthly",
                nextDueDate = entry.NextDueDate,
                remindDaysBefore = 3,
                isActive = false,
            }, TestContext.Current.CancellationToken);
        deactivate.EnsureSuccessStatusCode();

        var response = await ConfirmAsync(entry.Id, new { expectedDueDate = entry.NextDueDate });

        await AssertRejectedAsync(response, "recurringBill.inactive");
    }

    [Fact]
    public async Task A_transfer_entry_needs_both_accounts_and_no_category()
    {
        var from = await CreateAccountAsync();
        var category = await CreateCategoryAsync();

        await AssertValidationErrorAsync(
            await Client.PostAsJsonAsync("/api/recurring-bills", Body("transfer", "10.00", from, null, null), TestContext.Current.CancellationToken),
            "toAccountId");
        await AssertValidationErrorAsync(
            await Client.PostAsJsonAsync("/api/recurring-bills", Body("transfer", "10.00", null, from, null), TestContext.Current.CancellationToken),
            "accountId");
        await AssertValidationErrorAsync(
            await Client.PostAsJsonAsync("/api/recurring-bills", Body("transfer", "10.00", from, from, null), TestContext.Current.CancellationToken),
            "toAccountId");
        await AssertValidationErrorAsync(
            await Client.PostAsJsonAsync("/api/recurring-bills", Body("transfer", "10.00", from, await CreateAccountAsync(), category), TestContext.Current.CancellationToken),
            "categoryId");
    }

    [Fact]
    public async Task An_expense_or_income_entry_refuses_a_destination_account()
    {
        var account = await CreateAccountAsync();
        var other = await CreateAccountAsync();

        await AssertValidationErrorAsync(
            await Client.PostAsJsonAsync("/api/recurring-bills", Body("expense", "10.00", account, other, null), TestContext.Current.CancellationToken),
            "toAccountId");
        await AssertValidationErrorAsync(
            await Client.PostAsJsonAsync("/api/recurring-bills", Body("income", "10.00", account, other, null), TestContext.Current.CancellationToken),
            "toAccountId");
    }

    [Fact]
    public async Task Changing_the_shape_keeps_the_fields_the_new_shape_needs()
    {
        var account = await CreateAccountAsync("400.00");
        var destination = await CreateAccountAsync("50.00");
        var entry = await CreateEntryAsync("expense", "40.00", accountId: account);

        await AssertValidationErrorAsync(await UpdateAsync(entry, "transfer", toAccountId: null), "toAccountId");

        var switched = await UpdateAsync(entry, "transfer", toAccountId: destination);
        switched.EnsureSuccessStatusCode();
        var asTransfer = (await switched.Content.ReadFromJsonAsync<EntryDto>(TestContext.Current.CancellationToken))!;
        Assert.Equal("transfer", asTransfer.Shape);
        Assert.Equal(destination, asTransfer.ToAccountId);

        await AssertValidationErrorAsync(await UpdateAsync(asTransfer, "expense", toAccountId: destination), "toAccountId");

        var back = await UpdateAsync(asTransfer, "income", toAccountId: null);
        back.EnsureSuccessStatusCode();
        Assert.Equal("income", (await back.Content.ReadFromJsonAsync<EntryDto>(TestContext.Current.CancellationToken))!.Shape);
    }

    [Fact]
    public async Task Confirmed_shapes_reach_budgets_reports_and_the_dashboard()
    {
        var today = Today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var account = await CreateAccountAsync("1000.00");
        var destination = await CreateAccountAsync("0.00");
        var expenseCategory = await CreateCategoryAsync();
        var incomeCategory = await CreateCategoryAsync("income");
        await PostAsync<IdDto>(
            Client,
            "/api/budgets",
            new { categoryId = expenseCategory, limitAmount = "500.00", period = "monthly", rolloverEnabled = false });

        var reportBefore = await ReportAsync();
        var dashboardBefore = await DashboardAsync();

        await ConfirmOkAsync(await CreateEntryAsync("expense", "30.00", accountId: account, categoryId: expenseCategory, nextDueDate: today));
        await ConfirmOkAsync(await CreateEntryAsync("income", "80.00", accountId: account, categoryId: incomeCategory, nextDueDate: today));
        await ConfirmOkAsync(await CreateEntryAsync("transfer", "200.00", accountId: account, toAccountId: destination, nextDueDate: today));

        var budget = (await Client.GetFromJsonAsync<List<BudgetDto>>("/api/budgets", TestContext.Current.CancellationToken))!
            .Single(b => b.CategoryId == expenseCategory);
        Assert.Equal("30.00", budget.Spent);

        var reportAfter = await ReportAsync();
        Assert.Equal(30.00m, Money(reportAfter.TotalExpense) - Money(reportBefore.TotalExpense));
        Assert.Equal(80.00m, Money(reportAfter.TotalIncome) - Money(reportBefore.TotalIncome));

        var dashboardAfter = await DashboardAsync();
        Assert.Equal(30.00m, Money(dashboardAfter.MonthExpense) - Money(dashboardBefore.MonthExpense));
        Assert.Equal(80.00m, Money(dashboardAfter.MonthIncome) - Money(dashboardBefore.MonthIncome));

        Assert.Equal("850.00", await CurrentBalanceAsync(account));
        Assert.Equal("200.00", await CurrentBalanceAsync(destination));
    }

    [Fact]
    public async Task The_reminder_job_notifies_for_every_shape()
    {
        var account = await CreateAccountAsync("100.00");
        var destination = await CreateAccountAsync("0.00");
        var due = Today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var expense = await CreateEntryAsync("expense", "5.00", accountId: account, nextDueDate: due);
        var income = await CreateEntryAsync("income", "6.00", accountId: account, nextDueDate: due);
        var transfer = await CreateEntryAsync("transfer", "7.00", accountId: account, toAccountId: destination, nextDueDate: due);
        var job = new RecurringBillReminderJob(
            Services.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<RecurringBillReminderJob>.Instance);

        await job.ScanAsync(TestContext.Current.CancellationToken);

        var unread = (await Client.GetFromJsonAsync<List<NotificationDto>>("/api/notifications?unread=true", TestContext.Current.CancellationToken))!;
        Assert.Equal("expense", Reminder(unread, expense.Id).Payload.Shape);
        Assert.Equal("income", Reminder(unread, income.Id).Payload.Shape);
        Assert.Equal("transfer", Reminder(unread, transfer.Id).Payload.Shape);
        Assert.Equal(Today, Reminder(unread, transfer.Id).Payload.DueDate);
        Assert.Equal(transfer.Name, Reminder(unread, transfer.Id).Title);
    }

    private static NotificationDto Reminder(List<NotificationDto> unread, Guid entryId) =>
        unread.Single(n => n.RelatedType == NotificationRelated.RecurringBill && n.RelatedId == entryId);

    private static decimal Money(string value) => decimal.Parse(value, CultureInfo.InvariantCulture);

    private async Task<ReportSummaryDto> ReportAsync() =>
        (await Client.GetFromJsonAsync<ReportSummaryDto>("/api/reports/summary"))!;

    private async Task<DashboardSummaryDto> DashboardAsync() =>
        (await Client.GetFromJsonAsync<DashboardSummaryDto>("/api/dashboard/summary"))!;

    private async Task<TransferDto> TransferAsync(DateOnly date, Guid? transferId)
    {
        var iso = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var page = await Client.GetFromJsonAsync<PageDto<TransferDto>>($"/api/transfers?date={iso}&pageSize=100");
        return page!.Items.Single(t => t.Id == transferId);
    }

    private async Task<EntryDto> CreateOfShapeAsync(string shape)
    {
        var account = await CreateAccountAsync("300.00");
        return shape == "transfer"
            ? await CreateEntryAsync(shape, "10.00", accountId: account, toAccountId: await CreateAccountAsync("0.00"))
            : await CreateEntryAsync(shape, "10.00", accountId: account);
    }

    private Task<EntryDto> CreateEntryAsync(
        string shape,
        string amount,
        Guid? accountId = null,
        Guid? toAccountId = null,
        Guid? categoryId = null,
        string nextDueDate = "2026-08-01") =>
        PostAsync<EntryDto>(Client, "/api/recurring-bills", Body(shape, amount, accountId, toAccountId, categoryId, nextDueDate));

    private static object Body(
        string shape,
        string amount,
        Guid? accountId,
        Guid? toAccountId,
        Guid? categoryId,
        string nextDueDate = "2026-08-01") => new
        {
            name = $"Entry {Guid.NewGuid():N}",
            shape,
            kind = "fixed",
            amount,
            categoryId,
            accountId,
            toAccountId,
            cadence = "monthly",
            nextDueDate,
            remindDaysBefore = 3,
        };

    private Task<HttpResponseMessage> UpdateAsync(EntryDto entry, string shape, Guid? toAccountId) =>
        Client.PutAsJsonAsync(
            $"/api/recurring-bills/{entry.Id}",
            new
            {
                id = entry.Id,
                name = entry.Name,
                shape,
                kind = "fixed",
                amount = entry.Amount,
                categoryId = (Guid?)null,
                accountId = entry.AccountId,
                toAccountId,
                cadence = "monthly",
                nextDueDate = entry.NextDueDate,
                remindDaysBefore = 3,
                isActive = true,
            });

    private Task<HttpResponseMessage> ConfirmAsync(Guid id, object body) =>
        Client.PostAsJsonAsync($"/api/recurring-bills/{id}/confirm", body);

    private async Task<ConfirmEntryDto> ConfirmOkAsync(EntryDto entry, object? body = null)
    {
        var response = await ConfirmAsync(entry.Id, body ?? new { expectedDueDate = entry.NextDueDate });
        Assert.True(
            response.IsSuccessStatusCode,
            $"confirm {entry.Id}: {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<ConfirmEntryDto>())!;
    }

    private sealed record EntryDto(
        Guid Id,
        string Name,
        string Shape,
        string Kind,
        string? Amount,
        Guid? CategoryId,
        Guid? AccountId,
        Guid? ToAccountId,
        string Cadence,
        DateOnly NextDueDate,
        int RemindDaysBefore,
        bool IsActive);

    private sealed record ConfirmEntryDto(EntryDto Bill, Guid? TransactionId, Guid? TransferId);

    private sealed record NotificationPayloadDto(DateOnly? DueDate, string? Shape);

    private sealed record NotificationDto(
        Guid Id,
        string Title,
        NotificationPayloadDto Payload,
        string? RelatedType,
        Guid? RelatedId);

    private sealed record ReportSummaryDto(string TotalIncome, string TotalExpense, string Net);

    private sealed record DashboardSummaryDto(string TotalBalance, string MonthIncome, string MonthExpense);
}
