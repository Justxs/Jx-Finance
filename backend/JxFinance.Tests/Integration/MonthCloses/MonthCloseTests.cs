using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.MonthCloses;
using JxFinance.Domain.Notifications;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.MonthCloses;

[Collection<ReportsCollection>]
public sealed class MonthCloseTests(ReportsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string March = "2025-03";

    [Fact]
    public async Task Closing_an_ended_month_freezes_the_report_figures()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var salary = await CreateCategoryAsync("income", member);
        await CreateTransactionAsync(member, account, food, "expense", "40.00", "2025-03-04");
        await CreateTransactionAsync(member, account, salary, "income", "900.00", "2025-03-10");
        await CreateTransactionAsync(member, account, food, "expense", "15.00", "2025-02-20");

        var closed = await CloseAsync(member, March, "Matched the statement");
        var year = await member.GetFromJsonAsync<YearDto>("/api/month-close?year=2025", TestContext.Current.CancellationToken);

        Assert.Equal("closed", closed.Status);
        Assert.Equal("Matched the statement", closed.Note);
        Assert.Equal(("900.00", "40.00", "860.00"), (closed.Figures.TotalIncome, closed.Figures.TotalExpense, closed.Figures.Net));
        Assert.Equal("15.00", closed.Figures.Comparison!.TotalExpense);
        Assert.Equal(("2025-02-01", "2025-02-28"), (closed.Figures.Comparison.PeriodStart, closed.Figures.Comparison.PeriodEnd));
        Assert.Equal(0, closed.Drift!.RowCount);
        Assert.Equal(("900.00", "900.00"), (closed.Drift.Totals!.ClosedIncome, closed.Figures.TotalIncome));
        Assert.Equal(12, year!.Months.Count);
        Assert.Equal(["open", "open", "closed"], year.Months.Take(3).Select(m => m.Status));
    }

    [Fact]
    public async Task A_month_that_has_not_ended_or_is_malformed_is_refused()
    {
        using var member = await CreateUserClientAsync();
        var current = Today.ToString("yyyy-MM", System.Globalization.CultureInfo.InvariantCulture);

        var running = await member.PostAsJsonAsync($"/api/month-close/{current}", new { note = (string?)null }, TestContext.Current.CancellationToken);
        var malformed = await member.GetAsync("/api/month-close/2025-13", TestContext.Current.CancellationToken);
        var review = await ReviewAsync(member, current);

        await AssertProblemAsync(running, HttpStatusCode.Conflict, "monthClose.notEnded");
        await AssertProblemAsync(malformed, HttpStatusCode.BadRequest, "month.invalid");
        Assert.Equal("notEnded", review.Status);
    }

    [Fact]
    public async Task Adding_editing_and_deleting_rows_in_the_month_show_as_drift()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var edited = await CreateTransactionAsync(member, account, food, "expense", "40.00", "2025-03-04", "Market");
        var deleted = await CreateTransactionAsync(member, account, food, "expense", "10.00", "2025-03-05");
        await CloseAsync(member, March);

        await UpdateAsync(member, edited, account, food, "55.00", "2025-03-04", "Market");
        (await member.DeleteAsync($"/api/transactions/{deleted.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var added = await CreateTransactionAsync(member, account, food, "expense", "7.00", "2025-03-20");

        var review = await ReviewAsync(member, March);

        Assert.Equal("closedChanged", review.Status);
        Assert.Equal(("50.00", "62.00"), (review.Drift!.Totals!.ClosedExpense, review.Figures.TotalExpense));
        Assert.Equal(3, review.Drift.RowCount);
        Assert.Equal("edited", Row(review, edited.Id).Change);
        Assert.Equal("deleted", Row(review, deleted.Id).Change);
        Assert.Equal("created", Row(review, added.Id).Change);
        var category = Assert.Single(review.Drift.Categories);
        Assert.Equal((food, "50.00", "62.00"), (category.CategoryId, category.ClosedAmount, category.CurrentAmount));
    }

    [Fact]
    public async Task Moving_a_selection_to_another_account_and_deleting_one_are_drift()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var other = await CreateAccountAsync("1000.00", client: member);
        var moved = await CreateTransactionAsync(member, account, null, "expense", "40.00", "2025-03-04", "Rent");
        var deleted = await CreateTransactionAsync(member, account, null, "expense", "10.00", "2025-03-05", "Coffee");
        await CloseAsync(member, March);

        (await member.PostAsJsonAsync("/api/transactions/bulk-account", new { transactionIds = new[] { moved.Id }, accountId = other }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        (await member.PostAsJsonAsync("/api/transactions/bulk-delete", new { transactionIds = new[] { deleted.Id } }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

        var review = await ReviewAsync(member, March);
        Assert.Equal("closedChanged", review.Status);
        Assert.Equal("edited", Row(review, moved.Id).Change);
        Assert.Equal("deleted", Row(review, deleted.Id).Change);
        Assert.Equal(("50.00", "40.00"), (review.Drift!.Totals!.ClosedExpense, review.Figures.TotalExpense));
    }

    [Fact]
    public async Task Rows_in_other_months_are_ignored_and_rows_moved_out_or_merely_edited_are_drift()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var moved = await CreateTransactionAsync(member, account, null, "expense", "40.00", "2025-03-04", "Rent");
        var renamed = await CreateTransactionAsync(member, account, null, "expense", "25.00", "2025-03-05", "Before");
        await CloseAsync(member, March);

        var april = await CreateTransactionAsync(member, account, null, "expense", "12.00", "2025-04-02");
        Assert.Equal("closed", (await ReviewAsync(member, March)).Status);
        await UpdateAsync(member, moved, account, null, "40.00", "2025-04-01", "Rent");
        var year = await member.GetFromJsonAsync<YearDto>("/api/month-close?year=2025", TestContext.Current.CancellationToken);
        await UpdateAsync(member, renamed, account, null, "25.00", "2025-03-05", "After");

        var review = await ReviewAsync(member, March);
        Assert.Equal("closedChanged", year!.Months[2].Status);
        Assert.Equal("closedChanged", review.Status);
        Assert.Equal(2, review.Drift!.RowCount);
        Assert.DoesNotContain(review.Drift.Rows, r => r.Id == april.Id);
        Assert.Equal("movedOut", Row(review, moved.Id).Change);
        Assert.Equal("edited", Row(review, renamed.Id).Change);
        Assert.Equal(("65.00", "25.00"), (review.Drift.Totals!.ClosedExpense, review.Figures.TotalExpense));
    }

    [Fact]
    public async Task Re_closing_accepts_the_drift_and_reopening_removes_the_close()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await CloseAsync(member, March, "First pass");
        await CreateTransactionAsync(member, account, null, "expense", "9.00", "2025-03-09");

        var reclosed = await CloseAsync(member, March);
        var noted = await ReadOkAsync<ReviewDto>(
            await member.PutAsJsonAsync($"/api/month-close/{March}/note", new { note = "Second pass" }, TestContext.Current.CancellationToken));
        (await member.DeleteAsync($"/api/month-close/{March}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var again = await member.DeleteAsync($"/api/month-close/{March}", TestContext.Current.CancellationToken);
        var reopened = await ReviewAsync(member, March);

        Assert.Equal(("closed", "First pass"), (reclosed.Status, reclosed.Note));
        Assert.Equal("Second pass", noted.Note);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.Equal("open", reopened.Status);
        Assert.Null(reopened.Drift);
    }

    [Fact]
    public async Task Closes_belong_to_one_user_and_scope_and_a_partners_edit_is_drift()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("1000.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var row = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "30.00", "2025-03-06", "Groceries");
        var url = $"/api/month-close/{March}";
        await ReadOkAsync<ReviewDto>(await SendScopedAsync(pair.OwnerClient, HttpMethod.Post, url, pair.HouseholdId, new { note = (string?)null }));

        await UpdateAsync(pair.PartnerClient, row, shared, null, "45.00", "2025-03-06", "Groceries");

        var ownerInHousehold = await GetScopedAsync<ReviewDto>(pair.OwnerClient, url, pair.HouseholdId);
        var ownerEverything = await GetScopedAsync<ReviewDto>(pair.OwnerClient, url, null);
        var partnerInHousehold = await GetScopedAsync<ReviewDto>(pair.PartnerClient, url, pair.HouseholdId);

        Assert.Equal("closedChanged", ownerInHousehold.Status);
        Assert.Equal("edited", Row(ownerInHousehold, row.Id).Change);
        Assert.Equal("open", ownerEverything.Status);
        Assert.Equal("open", partnerInHousehold.Status);
    }

    [Fact]
    public async Task Deleting_a_category_stamps_its_rows_and_shows_as_drift()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var row = await CreateTransactionAsync(member, account, food, "expense", "40.00", "2025-03-04");
        await CloseAsync(member, March);

        (await member.DeleteAsync($"/api/categories/{food}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var review = await ReviewAsync(member, March);
        Assert.Equal("closedChanged", review.Status);
        Assert.Equal("edited", Row(review, row.Id).Change);
        Assert.Contains(review.Drift!.Categories, c => c.CategoryId == food && c.CurrentAmount == "0.00");
        Assert.Contains(review.Drift.Categories, c => c.CategoryId == null && c.CurrentAmount == "40.00");
    }

    [Fact]
    public async Task A_reporting_currency_change_is_reported_without_per_figure_drift()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await CreateAccountAsync("1000.00", client: member);
        await CreateTransactionAsync(member, account, null, "expense", "40.00", "2025-03-04");
        await CloseAsync(member, March);

        await SqlAsync($$"""UPDATE "MonthCloses" SET "Snapshot" = jsonb_set("Snapshot", '{reportingCurrency}', '"usd"') WHERE "UserId" = {{user.Id}}""");

        var review = await ReviewAsync(member, March);
        var year = await member.GetFromJsonAsync<YearDto>("/api/month-close?year=2025", TestContext.Current.CancellationToken);
        Assert.Equal("closedChanged", review.Status);
        Assert.True(review.Drift!.CurrencyChanged);
        Assert.Null(review.Drift.Totals);
        Assert.Empty(review.Drift.Rows);
        Assert.Equal("closedChanged", year!.Months[2].Status);
    }

    [Fact]
    public async Task A_figure_only_change_marks_the_year_list_and_the_review_alike()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var row = await CreateTransactionAsync(member, account, null, "expense", "40.00", "2025-03-04");
        await CloseAsync(member, March);

        await SqlAsync($"""UPDATE "Transactions" SET "ReportingAmount" = 45 WHERE "Id" = {row.Id}""");

        var review = await ReviewAsync(member, March);
        var year = await member.GetFromJsonAsync<YearDto>("/api/month-close?year=2025", TestContext.Current.CancellationToken);
        Assert.Equal(0, review.Drift!.RowCount);
        Assert.Equal("closedChanged", review.Status);
        Assert.Equal("closedChanged", year!.Months[2].Status);
    }

    [Fact]
    public async Task A_revaluation_stamps_the_rows_whose_reporting_amount_it_rewrites()
    {
        using var member = await CreateUserClientAsync();
        var dollars = await CreateAccountAsync("1000.00", currency: "usd", client: member);
        var row = await CreateTransactionAsync(member, dollars, null, "expense", "40.00", "2025-03-04");
        var before = await UpdatedAtAsync(row.Id);

        await using (await OverrideSettingsAsync(settings => settings["reportingCurrency"] = "usd"))
        {
            Assert.True(await UpdatedAtAsync(row.Id) > before);
        }
    }

    [Fact]
    public async Task The_checklist_counts_match_the_ledger_filters_they_link_to()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        await CreateTransactionAsync(member, account, null, "expense", "12.00", "2025-03-02");
        await CreateTransactionAsync(member, account, food, "expense", "20.00", "2025-03-03");
        await RecordTransactionAsync(member, new
        {
            accountId = account,
            type = "expense",
            amount = "30.00",
            date = "2025-03-04",
            lines = new object[]
            {
                new { categoryId = food, amount = "20.00" },
                new { categoryId = (Guid?)null, amount = "10.00" },
            },
        });
        var unusual = await CreateTransactionAsync(member, account, food, "expense", "90.00", "2025-03-05");
        await SqlAsync($"""UPDATE "Transactions" SET "UnusualBasis" = 'Payee', "UnusualTypicalAmount" = 30, "UnusualFactor" = 3, "UnusualSampleSize" = 5, "UnusualCheckedAt" = now() WHERE "Id" = {unusual.Id}""");
        await CreateTransactionAsync(member, account, null, "expense", "5.00", "2025-04-01");
        await CreateTransactionAsync(member, account, food, "expense", "3.50", "2025-03-30", "Kava");
        await CreateTransactionAsync(member, account, food, "expense", "3.50", "2025-04-01", "Kava ");
        await PostAsync<IdDto>(member, "/api/recurring-bills", new
        {
            name = "Rent",
            shape = "expense",
            kind = "fixed",
            amount = "500.00",
            accountId = account,
            cadence = "monthly",
            nextDueDate = "2025-03-28",
            remindDaysBefore = 0,
        });

        var review = await ReviewAsync(member, March);
        var uncategorized = await member.GetFromJsonAsync<SummaryDto>(
            "/api/transactions/summary?dateFrom=2025-03-01&dateTo=2025-03-31&uncategorized=true",
            TestContext.Current.CancellationToken);
        var flagged = await member.GetFromJsonAsync<SummaryDto>(
            "/api/transactions/summary?dateFrom=2025-03-01&dateTo=2025-03-31&unusual=true",
            TestContext.Current.CancellationToken);
        var duplicates = await member.GetFromJsonAsync<SummaryDto>(
            "/api/transactions/summary?dateFrom=2025-03-01&dateTo=2025-03-31&duplicates=true",
            TestContext.Current.CancellationToken);

        Assert.Equal(2, review.Checklist.Uncategorized);
        Assert.Equal(uncategorized!.Count, review.Checklist.Uncategorized);
        Assert.Equal(1, review.Checklist.Unusual);
        Assert.Equal(flagged!.Count, review.Checklist.Unusual);
        Assert.Equal(1, review.Checklist.UnconfirmedRecurring);
        Assert.Equal(1, review.Checklist.Duplicates);
        Assert.Equal(duplicates!.Count, review.Checklist.Duplicates);
    }

    [Fact]
    public async Task Budgets_are_measured_as_of_the_last_day_of_the_month()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var budget = await PostAsync<IdDto>(
            member,
            "/api/budgets",
            new { categoryId = food, limitAmount = "100.00", period = "monthly", rolloverEnabled = true });
        await SqlAsync($"""UPDATE "Budgets" SET "CreatedAt" = '2025-01-01T00:00:00Z' WHERE "Id" = {budget.Id}""");
        await CreateTransactionAsync(member, account, food, "expense", "70.00", "2025-02-10");
        await CreateTransactionAsync(member, account, food, "expense", "45.00", "2025-03-10");
        await CreateTransactionAsync(member, account, food, "expense", "80.00", "2025-04-10");

        var review = await ReviewAsync(member, March);

        var usage = Assert.Single(review.Budgets!);
        Assert.Equal(("2025-03-01", "2025-03-31"), (usage.WindowStart, usage.WindowEnd));
        Assert.Equal(("45.00", "130.00"), (usage.Spent, usage.CarriedAmount));
    }

    [Fact]
    public async Task Switching_the_feature_off_hides_the_endpoints()
    {
        using var member = await CreateUserClientAsync();

        await using (await FeatureOffAsync("monthClose"))
        {
            var response = await member.GetAsync($"/api/month-close/{March}", TestContext.Current.CancellationToken);
            await AssertProblemAsync(response, HttpStatusCode.NotFound, "feature.disabled");
        }
    }

    [Fact]
    public async Task The_reminder_goes_once_to_users_who_closed_before_and_skipped_last_month()
    {
        var closer = await CreateUserAsync();
        var newcomer = await CreateUserAsync();
        var upToDate = await CreateUserAsync();
        using (var client = await LoginAsync(closer))
        {
            await CloseAsync(client, "2025-01");
        }

        await WithDbAsync(async db =>
        {
            db.MonthCloses.Add(new MonthClose
            {
                UserId = upToDate.Id,
                Month = new DateOnly(2026, 9, 1),
                ClosedAt = DateTimeOffset.UtcNow,
                Snapshot = new MonthCloseSnapshot(Currency.Eur, 0, 0, 0, 0, [], [], []),
            });
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });

        var earlyOctober = new TestClock(new DateTimeOffset(2026, 10, 2, 8, 0, 0, TimeSpan.Zero));
        await Job<MonthCloseReminderJob>(earlyOctober).RunOnceAsync(TestContext.Current.CancellationToken);
        await Job<MonthCloseReminderJob>(earlyOctober).RunOnceAsync(TestContext.Current.CancellationToken);
        await Job<MonthCloseReminderJob>(new TestClock(new DateTimeOffset(2026, 11, 9, 8, 0, 0, TimeSpan.Zero)))
            .RunOnceAsync(TestContext.Current.CancellationToken);

        var reminders = await WithDbAsync(db => db.Notifications
            .IgnoreQueryFilters()
            .Where(n => n.Type == NotificationType.MonthReadyToClose)
            .Where(n => n.UserId == closer.Id || n.UserId == newcomer.Id || n.UserId == upToDate.Id)
            .ToListAsync(TestContext.Current.CancellationToken));
        var reminder = Assert.Single(reminders);
        Assert.Equal(closer.Id, reminder.UserId);
        Assert.Equal(new DateOnly(2026, 9, 1), reminder.Payload!.Month);
        Assert.Equal("September 2026 has ended and is ready to close", reminder.Message);
    }

    [Fact]
    public async Task Each_account_with_a_statement_or_an_import_is_reconciled_differs_imported_or_behind()
    {
        using var member = await CreateUserClientAsync();
        var reconciled = await CreateAccountAsync("100.00", client: member);
        var differs = await CreateAccountAsync("100.00", client: member);
        var imported = await CreateAccountAsync("100.00", client: member);
        var behind = await CreateAccountAsync("100.00", client: member);
        var untouched = await CreateAccountAsync("100.00", client: member);
        await ReconcileAsync(member, reconciled, "2025-04-02", "100.00");
        await ReconcileAsync(member, reconciled, "2025-04-30", "1.00");
        await ReconcileAsync(member, reconciled, "2025-03-15", "5.00");
        await ReconcileAsync(member, differs, "2025-03-31", "112.30");
        await ImportRowAsync(member, differs, "2025-03-31");
        await ImportRowAsync(member, imported, "2025-03-31");
        await ImportRowAsync(member, behind, "2025-03-20");
        await ReconcileAsync(member, behind, "2025-03-25", "90.00");

        var accounts = (await ReviewAsync(member, March)).Checklist.Accounts;

        Assert.DoesNotContain(accounts, a => a.AccountId == untouched);
        Assert.Equal(("reconciled", new DateOnly(2025, 4, 2), "0.00"), State(accounts, reconciled));
        Assert.Equal(("differs", new DateOnly(2025, 3, 31), "22.30"), State(accounts, differs));
        Assert.Equal(("imported", new DateOnly(2025, 3, 31), (string?)null), State(accounts, imported));
        Assert.Equal(("behind", new DateOnly(2025, 3, 25), (string?)null), State(accounts, behind));

        await using (await FeatureOffAsync("import"))
        {
            var withoutImport = (await ReviewAsync(member, March)).Checklist.Accounts;
            Assert.Equal(new[] { differs, behind, reconciled }.Order(), withoutImport.Select(a => a.AccountId).Order());
            Assert.Equal(("behind", new DateOnly(2025, 3, 25), (string?)null), State(withoutImport, behind));
        }
    }

    [Fact]
    public async Task The_main_currency_decides_the_line_and_other_currencies_are_notes()
    {
        using var member = await CreateUserClientAsync();
        var both = await CreateAccountAsync("100.00", client: member);
        var dollarsOnly = await CreateAccountAsync("0.00", client: member);
        await RecordTransactionAsync(member, new { accountId = both, type = "income", amount = "50.00", currency = "usd", date = "2025-03-10" });
        await ReconcileAsync(member, both, "2025-03-31", "100.00");
        await PostAsync<ReconciliationDto>(member, $"/api/accounts/{both}/reconciliations", new { date = "2025-03-31", balance = "47.00", currency = "usd" });
        await PostAsync<ReconciliationDto>(member, $"/api/accounts/{dollarsOnly}/reconciliations", new { date = "2025-02-28", balance = "0.00", currency = "usd" });

        var accounts = (await ReviewAsync(member, March)).Checklist.Accounts;

        Assert.Equal(("reconciled", new DateOnly(2025, 3, 31), "0.00"), State(accounts, both));
        Assert.Equal([new CurrencyCoverageDto("usd", "differs", new DateOnly(2025, 3, 31), "-3.00")], accounts.Single(a => a.AccountId == both).OtherCurrencies);
        Assert.Equal(("behind", (DateOnly?)null, (string?)null), State(accounts, dollarsOnly));
        Assert.Equal([new CurrencyCoverageDto("usd", "behind", new DateOnly(2025, 2, 28), null)], accounts.Single(a => a.AccountId == dollarsOnly).OtherCurrencies);
    }

    private static (string, DateOnly?, string?) State(List<AccountCoverageDto> accounts, Guid id)
    {
        var account = accounts.Single(a => a.AccountId == id);
        return (account.State, account.Date, account.Difference);
    }

    private static Task<ReconciliationDto> ReconcileAsync(HttpClient client, Guid account, string date, string balance) =>
        PostAsync<ReconciliationDto>(client, $"/api/accounts/{account}/reconciliations", new { date, balance });

    private static Task<object> ImportRowAsync(HttpClient client, Guid account, string date) =>
        PostAsync<object>(client, "/api/import/confirm", new
        {
            accountId = account,
            rows = new[] { new { importRef = $"ROW-{Guid.NewGuid():N}", date, amount = "10.00", type = "expense" } },
        });

    private static async Task<ReviewDto> CloseAsync(HttpClient client, string month, string? note = null) =>
        await ReadOkAsync<ReviewDto>(
            await client.PostAsJsonAsync($"/api/month-close/{month}", new { note }, TestContext.Current.CancellationToken));

    private static async Task<ReviewDto> ReviewAsync(HttpClient client, string month) =>
        (await client.GetFromJsonAsync<ReviewDto>($"/api/month-close/{month}", TestContext.Current.CancellationToken))!;

    private static async Task<TransactionDto> UpdateAsync(
        HttpClient client,
        TransactionDto row,
        Guid accountId,
        Guid? categoryId,
        string amount,
        string date,
        string? description) =>
        await ReadOkAsync<TransactionDto>(await client.PutAsJsonAsync(
            $"/api/transactions/{row.Id}",
            new { id = row.Id, accountId, categoryId, type = "expense", amount, date, description },
            TestContext.Current.CancellationToken));

    private Task<DateTimeOffset> UpdatedAtAsync(Guid id) =>
        SqlValueAsync<DateTimeOffset>($"""SELECT "UpdatedAt" AS "Value" FROM "Transactions" WHERE "Id" = {id}""");

    private static DriftRowDto Row(ReviewDto review, Guid id) => review.Drift!.Rows.Single(r => r.Id == id);

    private sealed record SummaryDto(int Count);

    private sealed record YearDto(int Year, List<MonthStatusDto> Months);

    private sealed record MonthStatusDto(DateOnly Month, string Status);

    private sealed record ComparisonDto(string PeriodStart, string PeriodEnd, string TotalExpense);

    private sealed record FiguresDto(string TotalIncome, string TotalExpense, string Net, ComparisonDto? Comparison);

    private sealed record ChecklistDto(int Uncategorized, int? UnconfirmedRecurring, int? Unusual, int Duplicates, List<AccountCoverageDto> Accounts);

    private sealed record AccountCoverageDto(Guid AccountId, string State, DateOnly? Date, string? Difference, List<CurrencyCoverageDto> OtherCurrencies);

    private sealed record CurrencyCoverageDto(string Currency, string State, DateOnly Date, string? Difference);

    private sealed record BudgetDto(string Spent, string CarriedAmount, string WindowStart, string WindowEnd);

    private sealed record TotalsDto(string ClosedIncome, string ClosedExpense);

    private sealed record CategoryDriftDto(Guid? CategoryId, string ClosedAmount, string CurrentAmount);

    private sealed record DriftRowDto(Guid Id, string Change);

    private sealed record DriftDto(
        bool CurrencyChanged,
        TotalsDto? Totals,
        List<CategoryDriftDto> Categories,
        List<DriftRowDto> Rows,
        int RowCount);

    private sealed record ReviewDto(
        string Status,
        string? Note,
        ChecklistDto Checklist,
        FiguresDto Figures,
        List<BudgetDto>? Budgets,
        DriftDto? Drift);
}
