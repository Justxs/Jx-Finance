using System.Net.Http.Json;
using JxFinance.Domain.Notifications;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.RecurringBills;

[Collection<IntegrationCollection>]
public sealed class PriceRiseTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_fixed_entry_matched_through_its_bank_text_reports_a_rise()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await ReadyAccountAsync(member);
        var bill = await BillAsync(member, account, "Streaming", "fixed", "9.99", matchKey: "NETFLIX.COM");
        await SpendAsync(member, account, "NETFLIX.COM 55512", "12.99", Today.AddDays(-1));

        await ScanAsync();

        var rise = Assert.Single(await RisesAsync(user.Id));
        Assert.Equal(bill, rise.RelatedId);
        Assert.Equal("12.99", rise.Payload!.Amount);
        Assert.Equal("9.99", rise.Payload.TypicalAmount);
        var listed = await ListedAsync(member, bill);
        Assert.Equal("netflix com", listed.MatchKey);
        Assert.True(listed.LatestMatch!.IsPriceRise);
        Assert.Equal("12.99", listed.LatestMatch.Amount);
        Assert.Equal("9.99", listed.LatestMatch.Expected);
    }

    [Fact]
    public async Task A_variable_entry_matched_through_its_name_compares_with_earlier_charges()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await ReadyAccountAsync(member);
        var bill = await BillAsync(member, account, "Vilniaus vandenys", "variable", null);
        await SpendAsync(member, account, "Vilniaus vandenys", "20.00", Today.AddDays(-90));
        await SpendAsync(member, account, "Vilniaus vandenys", "21.00", Today.AddDays(-60));
        await SpendAsync(member, account, "Vilniaus vandenys", "20.00", Today.AddDays(-30));
        await ScanAsync();
        await SpendAsync(member, account, "VILNIAUS VANDENYS", "25.00", Today.AddDays(-1));

        await ScanAsync();
        await ScanAsync();

        var rise = Assert.Single(await RisesAsync(user.Id));
        Assert.Equal(bill, rise.RelatedId);
        Assert.Equal("20.00", rise.Payload!.TypicalAmount);
        Assert.True((await ListedAsync(member, bill)).LatestMatch!.IsPriceRise);
    }

    [Fact]
    public async Task A_charge_at_the_expected_amount_is_no_rise()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await ReadyAccountAsync(member);
        var bill = await BillAsync(member, account, "Telia", "fixed", "24.99");
        await SpendAsync(member, account, "Telia", "24.99", Today.AddDays(-1));

        await ScanAsync();

        Assert.Empty(await RisesAsync(user.Id));
        var listed = await ListedAsync(member, bill);
        Assert.False(listed.LatestMatch!.IsPriceRise);
    }

    [Fact]
    public async Task A_charge_in_another_currency_is_skipped()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await ReadyAccountAsync(member);
        var bill = await BillAsync(member, account, "Spotify", "fixed", "9.99");
        await PostAsync<IdDto>(
            member,
            "/api/transactions",
            new { accountId = account, type = "expense", amount = "15.00", currency = "usd", date = Today.AddDays(-1), description = "Spotify" });

        await ScanAsync();

        Assert.Empty(await RisesAsync(user.Id));
        Assert.Null((await ListedAsync(member, bill)).LatestMatch);
    }

    private async Task<Guid> ReadyAccountAsync(HttpClient member)
    {
        var account = await CreateAccountAsync("5000.00", client: member);
        await SpendAsync(member, account, "Warm-up", "1.00", Today.AddMonths(-6));
        await ScanAsync();
        return account;
    }

    private static async Task<Guid> BillAsync(
        HttpClient client,
        Guid account,
        string name,
        string kind,
        string? amount,
        string? matchKey = null) =>
        (await PostAsync<IdDto>(
            client,
            "/api/recurring-bills",
            new
            {
                name,
                shape = "expense",
                kind,
                amount,
                accountId = account,
                cadence = "monthly",
                nextDueDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(20),
                remindDaysBefore = 0,
                matchKey,
            })).Id;

    private static Task<IdDto> SpendAsync(HttpClient client, Guid account, string description, string amount, DateOnly date) =>
        PostAsync<IdDto>(client, "/api/transactions", new { accountId = account, type = "expense", amount, date, description });

    private Task ScanAsync() => Job<UnusualAmountJob>().RunOnceAsync(TestContext.Current.CancellationToken);

    private Task<List<Notification>> RisesAsync(Guid userId) =>
        WithDbAsync(userId, db => db.Notifications
            .AsNoTracking()
            .Where(n => n.Type == NotificationType.RecurringPriceRise)
            .ToListAsync(TestContext.Current.CancellationToken));

    private static async Task<BillDto> ListedAsync(HttpClient client, Guid id) =>
        (await client.GetFromJsonAsync<List<BillDto>>("/api/recurring-bills", TestContext.Current.CancellationToken))!
            .Single(b => b.Id == id);

    private sealed record MatchDto(DateOnly Date, string Amount, string? Expected, bool IsPriceRise);

    private sealed record BillDto(Guid Id, string? MatchKey, MatchDto? LatestMatch);
}
