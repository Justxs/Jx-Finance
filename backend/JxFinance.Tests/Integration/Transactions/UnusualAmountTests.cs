using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class UnusualAmountTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Csv =
        "\"Sąskaitos Nr.\",\"\",\"Data\",\"Gavėjas\",\"Paaiškinimai\",\"Suma\",\"Valiuta\",\"D/K\",\"Įrašo Nr.\"\n"
        + "\"LT476300010172306416\",\"20\",\"{0}\",\"\",\"{1}\",\"{2}\",\"EUR\",\"D\",\"UNUSUAL-{3}\"\n";

    [Fact]
    public async Task Three_times_the_usual_amount_at_a_payee_is_flagged()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        await HistoryAsync(member, account, "Maxima Ukmerges", 40m, 42m, 44m, 41m);
        var big = await SpendAsync(member, account, "MAXIMA UKMERGES 12345", "126.00", Today.AddDays(-1));

        await ScanAsync();

        var flagged = await GetAsync(member, big);
        Assert.NotNull(flagged.Unusual);
        Assert.Equal("payee", flagged.Unusual.Basis);
        Assert.Equal("41.50", flagged.Unusual.TypicalAmount);
        Assert.Equal(3.04m, flagged.Unusual.Factor);
        Assert.False(flagged.UnusualDismissed);
    }

    [Fact]
    public async Task The_category_is_the_baseline_when_the_payee_is_new()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        var category = await CreateCategoryAsync(client: member);
        for (var i = 0; i < 8; i++)
        {
            await SpendAsync(member, account, $"Shop {i}", "30.00", Today.AddDays(-20 - i), category);
        }

        var big = await SpendAsync(member, account, "Brand new shop", "250.00", Today.AddDays(-1), category);

        await ScanAsync();

        var flagged = await GetAsync(member, big);
        Assert.Equal("category", flagged.Unusual?.Basis);
    }

    [Fact]
    public async Task Too_little_history_flags_nothing()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        await HistoryAsync(member, account, "Rimi", 20m, 20m, 20m);
        var big = await SpendAsync(member, account, "Rimi", "400.00", Today.AddDays(-1));

        await ScanAsync();

        Assert.Null((await GetAsync(member, big)).Unusual);
    }

    [Fact]
    public async Task Income_split_rows_and_transfers_are_never_flagged()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        var other = await CreateAccountAsync("0.00", client: member);
        var category = await CreateCategoryAsync(client: member);
        for (var i = 0; i < 5; i++)
        {
            await PostAsync<IdDto>(
                member,
                "/api/transactions",
                new { accountId = account, type = "income", amount = "100.00", date = Today.AddMonths(-1 - i), description = "Salary" });
        }

        var income = await PostAsync<IdDto>(
            member,
            "/api/transactions",
            new { accountId = account, type = "income", amount = "5000.00", date = Today.AddDays(-1), description = "Salary" });
        await HistoryAsync(member, account, "Split shop", 10m, 10m, 10m, 10m);
        var split = await PostAsync<IdDto>(
            member,
            "/api/transactions",
            new
            {
                accountId = account,
                type = "expense",
                amount = "900.00",
                date = Today.AddDays(-1),
                description = "Split shop",
                lines = new[] { new { categoryId = category, amount = "450.00" }, new { categoryId = category, amount = "450.00" } },
            });
        await PostAsync<IdDto>(
            member,
            "/api/transfers",
            new { fromAccountId = account, toAccountId = other, amount = "1000.00", date = Today.AddDays(-1) });

        await ScanAsync();

        Assert.Null((await GetAsync(member, income.Id)).Unusual);
        Assert.Null((await GetAsync(member, split.Id)).Unusual);
        var flaggedOnTransfer = await ListAsync(member, $"accountId={other}&unusual=true");
        Assert.Empty(flaggedOnTransfer.Items);
    }

    [Fact]
    public async Task Editing_back_to_normal_clears_the_flag_and_a_dismissal_survives_edits()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        await HistoryAsync(member, account, "Circle K", 50m, 52m, 48m, 50m);
        var big = await SpendAsync(member, account, "Circle K", "400.00", Today.AddDays(-1));
        var dismissed = await SpendAsync(member, account, "Circle K", "300.00", Today.AddDays(-2));
        await ScanAsync();
        Assert.NotNull((await GetAsync(member, big)).Unusual);

        (await member.PostAsync($"/api/transactions/{dismissed}/unusual/dismiss", null, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        await UpdateAsync(member, big, account, "Circle K", "51.00");
        await UpdateAsync(member, dismissed, account, "Circle K", "310.00");
        Assert.Null(await CheckedAtAsync(big));

        await ScanAsync();

        Assert.Null((await GetAsync(member, big)).Unusual);
        var stillDismissed = await GetAsync(member, dismissed);
        Assert.True(stillDismissed.UnusualDismissed);
        Assert.DoesNotContain(
            (await ListAsync(member, $"accountId={account}&unusual=true")).Items,
            t => t.Id == dismissed);
    }

    [Fact]
    public async Task Changing_only_the_tags_does_not_ask_for_a_new_check()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        var tag = await CreateTagAsync(client: member);
        var row = await SpendAsync(member, account, "Bolt", "7.40", Today.AddDays(-1));
        await ScanAsync();
        Assert.NotNull(await CheckedAtAsync(row));

        (await member.PutAsJsonAsync(
            $"/api/transactions/{row}",
            new { accountId = account, type = "expense", amount = "7.40", date = Today.AddDays(-1), description = "Bolt", tagIds = new[] { tag } },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.NotNull(await CheckedAtAsync(row));
    }

    [Fact]
    public async Task The_backfill_of_existing_rows_raises_no_notifications()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await CreateAccountAsync("5000.00", client: member);
        await HistoryAsync(member, account, "Senukai", 30m, 32m, 31m, 30m);
        var big = await SpendAsync(member, account, "Senukai", "400.00", Today.AddDays(-1));
        await SqlAsync($"""UPDATE "Transactions" SET "UnusualCheckedAt" = NULL""");

        await ScanAsync();

        Assert.NotNull((await GetAsync(member, big)).Unusual);
        Assert.Empty(await UnusualNotificationsAsync(user.Id));
    }

    [Fact]
    public async Task A_row_left_over_from_the_backfill_raises_no_notification_in_a_later_pass()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await CreateAccountAsync("5000.00", client: member);
        await EnsureNotBackfillAsync(member, account);
        await HistoryAsync(member, account, "Ermitazas", 30m, 32m, 31m, 30m);
        var leftover = await SpendAsync(member, account, "Ermitazas", "400.00", Today.AddDays(-1));
        await SqlAsync($"""UPDATE "Transactions" SET "UpdatedAt" = '2000-01-01T00:00:00Z' WHERE "Id" = {leftover}""");

        await ScanAsync();

        Assert.NotNull((await GetAsync(member, leftover)).Unusual);
        Assert.Empty(await UnusualNotificationsAsync(user.Id));
    }

    [Fact]
    public async Task More_than_three_flags_make_one_summary_and_a_second_run_notifies_nothing()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await CreateAccountAsync("50000.00", client: member);
        await EnsureNotBackfillAsync(member, account);
        for (var shop = 0; shop < 4; shop++)
        {
            await HistoryAsync(member, account, $"Shop {shop}", 20m, 21m, 22m, 20m);
            await SpendAsync(member, account, $"Shop {shop}", "300.00", Today.AddDays(-1));
        }

        await ScanAsync();
        await ScanAsync();

        var notifications = await UnusualNotificationsAsync(user.Id);
        var summary = Assert.Single(notifications);
        Assert.Equal(NotificationType.UnusualAmounts, summary.Type);
        Assert.Equal(4, summary.Payload!.Count);
    }

    [Fact]
    public async Task A_single_flag_raises_one_notification_about_that_row()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await CreateAccountAsync("5000.00", client: member);
        await EnsureNotBackfillAsync(member, account);
        await HistoryAsync(member, account, "Iki", 20m, 22m, 21m, 20m);
        var big = await SpendAsync(member, account, "Iki", "210.00", Today.AddDays(-1));

        await ScanAsync();
        await ScanAsync();

        var notification = Assert.Single(await UnusualNotificationsAsync(user.Id));
        Assert.Equal(NotificationType.UnusualAmount, notification.Type);
        Assert.Equal(big, notification.RelatedId);
        Assert.Equal("210.00", notification.Payload!.Amount);
    }

    [Fact]
    public async Task The_ledger_filter_pages_through_unusual_rows_only()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("50000.00", client: member);
        await HistoryAsync(member, account, "Hardware", 10m, 11m, 12m, 10m);
        for (var i = 0; i < 3; i++)
        {
            await SpendAsync(member, account, "Hardware", "200.00", Today.AddDays(-1 - i));
        }

        await ScanAsync();

        var first = await ListAsync(member, $"accountId={account}&unusual=true&page=1&pageSize=2");
        var second = await ListAsync(member, $"accountId={account}&unusual=true&page=2&pageSize=2");
        Assert.Equal(3, first.Total);
        Assert.Equal(2, first.Items.Count);
        Assert.Single(second.Items);
        Assert.All(first.Items.Concat(second.Items), t => Assert.NotNull(t.Unusual));
        var summary = await member.GetFromJsonAsync<SummaryDto>(
            $"/api/transactions/summary?accountId={account}&unusual=true",
            TestContext.Current.CancellationToken);
        Assert.Equal(3, summary!.Count);
    }

    [Fact]
    public async Task A_household_partner_sees_the_flag_on_a_shared_account()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync("5000.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        await HistoryAsync(pair.OwnerClient, account, "Family shop", 30m, 31m, 32m, 30m);
        var big = await SpendAsync(pair.PartnerClient, account, "Family shop", "300.00", Today.AddDays(-1));

        await ScanAsync();

        var seen = await ListAsync(pair.PartnerClient, $"accountId={account}&unusual=true");
        Assert.Contains(seen.Items, t => t.Id == big);
    }

    [Fact]
    public async Task The_preview_flag_matches_what_the_job_stores_after_confirming()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        await HistoryAsync(member, account, "PIRKINYS LIDL", 15m, 16m, 15m, 17m);
        var marker = Guid.NewGuid().ToString("N")[..8];
        var date = Today.AddDays(-1).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var csv = string.Format(CultureInfo.InvariantCulture, Csv, date, "PIRKINYS LIDL", "160.00", marker);

        var preview = await ReadOkAsync<PreviewDto>(await UploadCsvAsync(member, account, csv));
        var row = Assert.Single(preview.Rows);
        Assert.NotNull(row.Unusual);

        (await member.PostAsJsonAsync(
            "/api/import/confirm",
            new
            {
                accountId = account,
                rows = new[] { new { row.ImportRef, row.Date, row.Description, row.Amount, row.Type, categoryId = (Guid?)null } },
            },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        await ScanAsync();

        var stored = Assert.Single((await ListAsync(member, $"accountId={account}&search=LIDL&dateFrom={date}")).Items);
        Assert.Equal(row.Unusual.Basis, stored.Unusual?.Basis);
        Assert.Equal(row.Unusual.TypicalAmount, stored.Unusual?.TypicalAmount);
        Assert.Equal(row.Unusual.Factor, stored.Unusual?.Factor);
    }

    [Fact]
    public async Task Switching_the_feature_off_stops_the_job_and_hides_the_flags()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        await HistoryAsync(member, account, "Toys", 10m, 12m, 11m, 10m);
        var flagged = await SpendAsync(member, account, "Toys", "200.00", Today.AddDays(-1));
        await ScanAsync();

        await using (await FeatureOffAsync("unusualAmounts"))
        {
            var later = await SpendAsync(member, account, "Toys", "250.00", Today);
            await ScanAsync();

            Assert.Null(await CheckedAtAsync(later));
            var hidden = await GetAsync(member, flagged);
            Assert.Null(hidden.Unusual);
            Assert.False(hidden.UnusualDismissed);
            var unfiltered = await ListAsync(member, $"accountId={account}&unusual=true");
            Assert.True(unfiltered.Total > 1);
            var dismiss = await member.PostAsync($"/api/transactions/{flagged}/unusual/dismiss", null, TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.NotFound, dismiss.StatusCode);
        }

        Assert.NotNull((await GetAsync(member, flagged)).Unusual);
    }

    private async Task EnsureNotBackfillAsync(HttpClient member, Guid account)
    {
        await SpendAsync(member, account, "Warm-up", "1.00", Today.AddMonths(-6));
        await ScanAsync();
    }

    private async Task HistoryAsync(HttpClient client, Guid account, string description, params decimal[] amounts)
    {
        for (var i = 0; i < amounts.Length; i++)
        {
            await SpendAsync(
                client,
                account,
                description,
                amounts[i].ToString("0.00", CultureInfo.InvariantCulture),
                Today.AddDays(-30 * (i + 1)));
        }
    }

    private static async Task<Guid> SpendAsync(
        HttpClient client,
        Guid account,
        string description,
        string amount,
        DateOnly date,
        Guid? categoryId = null) =>
        (await PostAsync<IdDto>(
            client,
            "/api/transactions",
            new { accountId = account, categoryId, type = "expense", amount, date, description })).Id;

    private static async Task UpdateAsync(HttpClient client, Guid id, Guid account, string description, string amount)
    {
        var current = await GetAsync(client, id);
        var response = await client.PutAsJsonAsync(
            $"/api/transactions/{id}",
            new { accountId = account, type = "expense", amount, date = current.Date, description },
            TestContext.Current.CancellationToken);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    private Task ScanAsync() => Job<UnusualAmountJob>().RunOnceAsync(TestContext.Current.CancellationToken);

    private static async Task<UnusualTransactionDto> GetAsync(HttpClient client, Guid id) =>
        (await client.GetFromJsonAsync<UnusualTransactionDto>($"/api/transactions/{id}", TestContext.Current.CancellationToken))!;

    private static async Task<PageDto> ListAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<PageDto>($"/api/transactions?{query}", TestContext.Current.CancellationToken))!;

    private Task<DateTimeOffset?> CheckedAtAsync(Guid id)
    {
        var transactionId = new TransactionId(id);
        return WithDbAsync(db => db.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.Id == transactionId)
            .Select(t => t.UnusualCheckedAt)
            .SingleAsync(TestContext.Current.CancellationToken));
    }

    private Task<List<Notification>> UnusualNotificationsAsync(Guid userId) =>
        WithDbAsync(userId, db => db.Notifications
            .AsNoTracking()
            .Where(n => n.Type == NotificationType.UnusualAmount || n.Type == NotificationType.UnusualAmounts)
            .ToListAsync(TestContext.Current.CancellationToken));

    private sealed record UnusualDto(string Basis, string TypicalAmount, decimal Factor, int SampleSize);

    private sealed record UnusualTransactionDto(Guid Id, DateOnly Date, UnusualDto? Unusual, bool UnusualDismissed);

    private sealed record PageDto(List<UnusualTransactionDto> Items, int Total);

    private sealed record SummaryDto(int Count);

    private sealed record PreviewRowDto(
        string ImportRef,
        DateOnly Date,
        string? Description,
        string Amount,
        string Type,
        UnusualDto? Unusual);

    private sealed record PreviewDto(List<PreviewRowDto> Rows);
}
