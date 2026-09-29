using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Common.Subscriptions;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class RefundTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_refund_is_stored_negative_and_marks_the_purchase_it_refunds()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var purchase = await CreateTransactionAsync(member, account, food, "expense", "50.00", "2026-03-02", "Maxima");

        var refund = await RefundAsync(member, account, food, "20.00", "2026-03-05", purchase.Id);
        await RefundAsync(member, account, food, "5.00", "2026-03-06", purchase.Id);

        Assert.Equal(("expense", "-20.00", "-20.00"), (refund.Type, refund.Amount, refund.ReportingAmount));
        Assert.Equal(new RefundOfDto(purchase.Id, new DateOnly(2026, 3, 2), "Maxima"), refund.RefundOf);
        Assert.Null(refund.RefundedAmount);
        var page = await member.GetFromJsonAsync<PageDto<RefundRowDto>>($"/api/transactions?accountId={account}", TestContext.Current.CancellationToken);
        Assert.Equal("25.00", page!.Items.Single(t => t.Id == purchase.Id).RefundedAmount);
        Assert.Equal(purchase.Id, page.Items.Single(t => t.Id == refund.Id).RefundOf?.Id);
        Assert.Equal("25.00", (await GetAsync(member, purchase.Id)).RefundedAmount);
        Assert.Equal("75.00", await CurrentBalanceAsync(account, member));
    }

    [Fact]
    public async Task Invalid_refunds_are_refused_with_their_codes()
    {
        using var member = await CreateUserClientAsync();
        using var stranger = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var salary = await CreateCategoryAsync("income", member);
        var purchase = await CreateTransactionAsync(member, account, food, "expense", "50.00", "2026-03-02", "Maxima");
        var income = await CreateTransactionAsync(member, account, salary, "income", "900.00", "2026-03-01", "Salary");
        var refund = await RefundAsync(member, account, food, "10.00", "2026-03-03", purchase.Id);
        var strangerAccount = await CreateAccountAsync("100.00", client: stranger);
        var strangerPurchase = await CreateTransactionAsync(stranger, strangerAccount, null, "expense", "40.00", "2026-03-02");

        await AssertProblemAsync(
            await PostRawAsync(member, new
            {
                accountId = account,
                type = "expense",
                amount = "-10.00",
                date = "2026-03-04",
                lines = new object[] { new { categoryId = food, amount = "10.00" } },
            }),
            HttpStatusCode.BadRequest,
            "transaction.splitNotAllowed");
        await AssertProblemAsync(await PostRawAsync(member, Body(account, salary, "income", "-10.00", null)), HttpStatusCode.BadRequest, "money.positive");
        await AssertProblemAsync(await PostRawAsync(member, Body(account, food, "expense", "0.00", null)), HttpStatusCode.BadRequest, "money.nonZero");
        await AssertProblemAsync(await PostRawAsync(member, Body(account, salary, "expense", "-10.00", null)), HttpStatusCode.BadRequest, "category.wrongType");
        await AssertProblemAsync(await PostRawAsync(member, Body(account, food, "expense", "10.00", purchase.Id)), HttpStatusCode.BadRequest, "transaction.refundOriginalInvalid");
        foreach (var original in new[] { income.Id, refund.Id, strangerPurchase.Id, Guid.NewGuid() })
        {
            await AssertProblemAsync(await PostRawAsync(member, Body(account, food, "expense", "-10.00", original)), HttpStatusCode.BadRequest, "transaction.refundOriginalInvalid");
        }

        var ownLink = await member.PutAsJsonAsync(
            $"/api/transactions/{refund.Id}",
            new { id = refund.Id, accountId = account, categoryId = food, type = "expense", amount = "-10.00", date = "2026-03-03", refundOfTransactionId = refund.Id },
            TestContext.Current.CancellationToken);
        await AssertProblemAsync(ownLink, HttpStatusCode.BadRequest, "transaction.refundOriginalInvalid");
    }

    [Fact]
    public async Task A_refund_lowers_every_spending_total_and_raises_the_balance()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var tag = await CreateTagAsync(client: member);
        await Seed.BudgetAsync(member, food, "100.00");
        var monthStart = new DateOnly(Today.Year, Today.Month, 1);
        var purchase = await RecordTransactionAsync(member, new { accountId = account, categoryId = food, type = "expense", amount = "50.00", date = monthStart, description = "Maxima", tagIds = new[] { tag } });
        await RecordTransactionAsync(member, new { accountId = account, categoryId = food, type = "expense", amount = "-20.00", date = monthStart, description = "Maxima", tagIds = new[] { tag }, refundOfTransactionId = purchase.Id });
        var month = $"dateFrom={monthStart:yyyy-MM-dd}&dateTo={monthStart.AddMonths(1).AddDays(-1):yyyy-MM-dd}";

        var report = await member.GetFromJsonAsync<ReportDto>($"/api/reports/summary?{month}", TestContext.Current.CancellationToken);
        var dashboard = await member.GetFromJsonAsync<DashboardDto>("/api/dashboard/summary", TestContext.Current.CancellationToken);
        var breakdown = await member.GetFromJsonAsync<BreakdownDto>($"/api/dashboard/category-breakdown?month={Today:yyyy-MM}", TestContext.Current.CancellationToken);
        var ledger = await member.GetFromJsonAsync<SummaryDto>($"/api/transactions/summary?{month}", TestContext.Current.CancellationToken);
        var budgets = await member.GetFromJsonAsync<List<BudgetDto>>("/api/budgets", TestContext.Current.CancellationToken);
        var csv = await member.GetStringAsync($"/api/transactions/export?accountId={account}", TestContext.Current.CancellationToken);
        var pdf = await member.GetAsync($"/api/transactions/export/pdf?accountId={account}", TestContext.Current.CancellationToken);

        Assert.Equal("30.00", report!.TotalExpense);
        Assert.Equal("30.00", report.ExpenseByCategory.Single(c => c.CategoryId == food).Amount);
        Assert.Equal("30.00", report.ExpenseByTag.Single(t => t.TagId == tag).Amount);
        Assert.Equal(("maxima", "30.00", 2), report.ExpenseByPayee.Select(p => (p.PayeeKey, p.Amount, p.Count)).Single());
        Assert.Equal("30.00", dashboard!.MonthExpense);
        Assert.Equal("30.00", breakdown!.Items.Single(c => c.CategoryId == food).Amount);
        Assert.Equal(("0.00", "30.00"), (ledger!.TotalIncome, ledger.TotalExpense));
        Assert.Equal("30.00", budgets!.Single(b => b.CategoryId == food).Spent);
        Assert.Equal("970.00", await CurrentBalanceAsync(account, member));
        Assert.Contains(",Expense,-20.00,", csv, StringComparison.Ordinal);
        Assert.Equal(HttpStatusCode.OK, pdf.StatusCode);
    }

    [Fact]
    public async Task A_category_whose_refunds_exceed_its_spending_keeps_its_negative_net_and_sorts_last()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var shoes = await CreateCategoryAsync(client: member);
        await CreateTransactionAsync(member, account, food, "expense", "40.00", "2026-04-03");
        await CreateTransactionAsync(member, account, shoes, "expense", "-60.00", "2026-04-04");

        var report = await member.GetFromJsonAsync<ReportDto>("/api/reports/summary?dateFrom=2026-04-01&dateTo=2026-04-30", TestContext.Current.CancellationToken);

        Assert.Equal([(food, "40.00"), (shoes, "-60.00")], report!.ExpenseByCategory.Select(c => (c.CategoryId, c.Amount)));
        Assert.Equal("-20.00", report.TotalExpense);
    }

    [Fact]
    public async Task A_refund_in_the_next_month_lowers_that_month_and_leaves_a_closed_month_unchanged()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var purchase = await CreateTransactionAsync(member, account, null, "expense", "50.00", "2025-03-20", "Boots");
        (await member.PostAsJsonAsync("/api/month-close/2025-03", new { note = (string?)null }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        await RefundAsync(member, account, null, "50.00", "2025-04-02", purchase.Id);

        var march = await member.GetFromJsonAsync<ReviewDto>("/api/month-close/2025-03", TestContext.Current.CancellationToken);
        var april = await member.GetFromJsonAsync<SummaryDto>("/api/transactions/summary?dateFrom=2025-04-01&dateTo=2025-04-30", TestContext.Current.CancellationToken);
        Assert.Equal("closed", march!.Status);
        Assert.Equal("-50.00", april!.TotalExpense);
    }

    [Fact]
    public async Task A_deleted_purchase_hides_the_link_and_the_purge_clears_it()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var purchase = await CreateTransactionAsync(member, account, null, "expense", "50.00", "2026-05-02", "Boots");
        var refund = await RefundAsync(member, account, null, "50.00", "2026-05-09", purchase.Id);

        (await member.DeleteAsync($"/api/transactions/{purchase.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Null((await GetAsync(member, refund.Id)).RefundOf);

        await BackdateDeletionAsync(purchase.Id);
        await Job<RetentionJob>().RunOnceAsync(TestContext.Current.CancellationToken);

        var link = await WithDbAsync(db => db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.Id == new TransactionId(refund.Id))
            .Select(t => new { t.RefundOfTransactionId })
            .SingleAsync(TestContext.Current.CancellationToken));
        Assert.Null(link.RefundOfTransactionId);
    }

    [Fact]
    public async Task The_unusual_amount_check_ignores_refunds_as_history_and_as_candidates()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        foreach (var days in new[] { 40, 30, 20 })
        {
            await CreateTransactionAsync(member, account, null, "expense", "20.00", Iso(Today.AddDays(-days)), "Rimi");
        }

        var refund = await CreateTransactionAsync(member, account, null, "expense", "-20.00", Iso(Today.AddDays(-10)), "Rimi");
        var big = await CreateTransactionAsync(member, account, null, "expense", "400.00", Iso(Today.AddDays(-1)), "Rimi");

        await Job<UnusualAmountJob>().RunOnceAsync(TestContext.Current.CancellationToken);

        Assert.Null((await GetAsync(member, big.Id)).Unusual);
        Assert.Null((await GetAsync(member, refund.Id)).Unusual);
        Assert.NotNull(await WithDbAsync(db => db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.Id == new TransactionId(refund.Id))
            .Select(t => t.UnusualCheckedAt)
            .SingleAsync(TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Subscription_detection_and_debt_payments_leave_refunds_out()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var name = "Refundable " + new string(Guid.NewGuid().ToString("N")[..12].Select(c => (char)('a' + Convert.ToInt32(c.ToString(), 16))).ToArray());
        var first = Today.AddMonths(-3);
        for (var month = 0; month < 3; month++)
        {
            await CreateTransactionAsync(member, account, null, "expense", "9.99", Iso(first.AddMonths(month)), name);
        }

        var refund = await CreateTransactionAsync(member, account, null, "expense", "-9.99", Iso(first.AddDays(10)), name);
        var debt = (await PostAsync<IdDto>(member, "/api/debts", new
        {
            name = "Mortgage",
            type = "mortgage",
            outstandingAmount = "1000.00",
            interestRate = 0m,
            asOf = Iso(first.AddMonths(-1)),
            tracksPayments = true,
        })).Id;

        var candidates = await member.GetFromJsonAsync<List<CandidateDto>>("/api/recurring-bills/suggestions", TestContext.Current.CancellationToken);
        var payments = await member.GetFromJsonAsync<List<IdDto>>($"/api/debts/{debt}/payment-candidates", TestContext.Current.CancellationToken);
        var link = await member.PostAsJsonAsync($"/api/debts/{debt}/payments", new { transactionId = refund.Id }, TestContext.Current.CancellationToken);

        var candidate = candidates!.Single(c => c.Description == SubscriptionDescription.Normalize(name));
        Assert.Equal(("9.99", 3), (candidate.TypicalAmount, candidate.OccurrenceDates.Count));
        Assert.DoesNotContain(refund.Id, payments!.Select(p => p.Id));
        await AssertProblemAsync(link, HttpStatusCode.BadRequest, "debt.paymentWrongType");
    }

    private static object Body(Guid accountId, Guid? categoryId, string type, string amount, Guid? refundOfTransactionId) =>
        new { accountId, categoryId, type, amount, date = "2026-03-04", refundOfTransactionId };

    private static Task<HttpResponseMessage> PostRawAsync(HttpClient client, object body) =>
        client.PostAsJsonAsync("/api/transactions", body, TestContext.Current.CancellationToken);

    private static Task<RefundRowDto> RefundAsync(HttpClient client, Guid accountId, Guid? categoryId, string amount, string date, Guid purchaseId) =>
        PostAsync<RefundRowDto>(
            client,
            "/api/transactions",
            new { accountId, categoryId, type = "expense", amount = $"-{amount}", date, description = "Refund", refundOfTransactionId = purchaseId });

    private static async Task<RefundRowDto> GetAsync(HttpClient client, Guid id) =>
        (await client.GetFromJsonAsync<RefundRowDto>($"/api/transactions/{id}", TestContext.Current.CancellationToken))!;

    private Task BackdateDeletionAsync(Guid entityId)
    {
        var old = DateTimeOffset.UtcNow.AddDays(-DeletionEntry.RetentionDays - 1);
        var typedId = new TransactionId(entityId);
        return WithDbAsync(async db =>
        {
            await db.Transactions.IgnoreQueryFilters()
                .Where(t => t.Id == typedId)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.UpdatedAt, old), TestContext.Current.CancellationToken);
            await db.DeletionEntries.IgnoreQueryFilters()
                .Where(e => e.EntityId == entityId)
                .ExecuteUpdateAsync(s => s.SetProperty(e => e.DeletedAt, old), TestContext.Current.CancellationToken);
        });
    }

    private static string Iso(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private sealed record RefundOfDto(Guid Id, DateOnly Date, string? Description);

    private sealed record UnusualDto(string Basis);

    private sealed record RefundRowDto(
        Guid Id,
        string Type,
        string Amount,
        string ReportingAmount,
        RefundOfDto? RefundOf,
        string? RefundedAmount,
        UnusualDto? Unusual);

    private sealed record CategoryDto(Guid? CategoryId, string Amount);

    private sealed record TagDto(Guid? TagId, string Amount);

    private sealed record PayeeDto(string? PayeeKey, string Amount, int Count);

    private sealed record ReportDto(string TotalExpense, List<CategoryDto> ExpenseByCategory, List<TagDto> ExpenseByTag, List<PayeeDto> ExpenseByPayee);

    private sealed record DashboardDto(string MonthExpense);

    private sealed record BreakdownDto(List<CategoryDto> Items);

    private sealed record SummaryDto(int Count, string TotalIncome, string TotalExpense);

    private sealed record ReviewDto(string Status);

    private sealed record CandidateDto(string Description, string TypicalAmount, List<DateOnly> OccurrenceDates);
}
