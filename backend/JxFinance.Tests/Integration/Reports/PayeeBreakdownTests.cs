using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Reports;

[Collection<IntegrationCollection>]
public sealed class PayeeBreakdownTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string March = "dateFrom=2026-03-01&dateTo=2026-03-31";

    [Fact]
    public async Task Descriptions_that_differ_only_in_reference_digits_are_one_payee_labelled_by_the_newest()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await ExpenseAsync(member, account, "2026-03-02", "12.00", "MAXIMA LT, UAB 20260302");
        await ExpenseAsync(member, account, "2026-03-20", "8.00", "Maxima LT UAB 20260320");
        await ExpenseAsync(member, account, "2026-03-05", "5.00", "Lidl");
        await ExpenseAsync(member, account, "2026-03-06", "3.00", null);

        var report = await ReportAsync(member, March);

        Assert.Equal(
            [("maxima lt uab", "Maxima LT UAB 20260320", "20.00", 2), ("lidl", "Lidl", "5.00", 1), (null, null, "3.00", 1)],
            report.ExpenseByPayee.Select(p => (p.PayeeKey, p.Label, p.Amount, p.Count)));
        Assert.All(report.ExpenseByPayee, p => Assert.Null(p.ComparisonAmount));
    }

    [Fact]
    public async Task A_split_expense_counts_once_and_income_and_investment_flows_are_left_out()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var broker = await CreateAccountAsync("1000.00", "investment", client: member);
        var food = await CreateCategoryAsync(client: member);
        var home = await CreateCategoryAsync(client: member);
        await RecordTransactionAsync(
            member,
            new
            {
                accountId = account,
                type = "expense",
                amount = "50.00",
                date = "2026-03-03",
                description = "Rimi Hyper",
                lines = new object[] { new { categoryId = food, amount = "30.00" }, new { categoryId = home, amount = "20.00" } },
            });
        await RecordTransactionAsync(member, new { accountId = account, type = "income", amount = "900.00", date = "2026-03-04", description = "Rimi Hyper" });
        await RecordInvestmentAsync(member, new { accountId = broker, type = "fee", date = "2026-03-04", amount = "1.25" });

        var report = await ReportAsync(member, March);

        var payee = Assert.Single(report.ExpenseByPayee);
        Assert.Equal(("rimi hyper", "50.00", 1), (payee.PayeeKey, payee.Amount, payee.Count));
        Assert.Equal("51.25", report.TotalExpense);
    }

    [Fact]
    public async Task A_comparison_merges_payees_with_zero_on_the_side_that_has_none()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await ExpenseAsync(member, account, "2026-03-10", "40.00", "Bolt");
        await ExpenseAsync(member, account, "2026-02-10", "15.00", "Bolt");
        await ExpenseAsync(member, account, "2026-02-12", "90.00", "Gym");
        await ExpenseAsync(member, account, "2026-03-12", "5.00", "Cafe");

        var report = await ReportAsync(member, $"{March}&comparison=previousMonth");

        Assert.Equal(
            [("gym", "Gym", "0.00", "90.00", 0), ("bolt", "Bolt", "40.00", "15.00", 1), ("cafe", "Cafe", "5.00", "0.00", 1)],
            report.ExpenseByPayee.Select(p => (p.PayeeKey, p.Label, p.Amount, p.ComparisonAmount, p.Count)));
    }

    [Fact]
    public async Task The_list_stops_at_fifty_payees()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("10000.00", client: member);
        for (var shop = 1; shop <= 52; shop++)
        {
            await ExpenseAsync(member, account, "2026-03-02", $"{shop}.00", $"Shop {Word(shop)}");
        }

        var report = await ReportAsync(member, March);

        Assert.Equal(50, report.ExpenseByPayee.Count);
        Assert.Equal("52.00", report.ExpenseByPayee[0].Amount);
        Assert.Equal("3.00", report.ExpenseByPayee[^1].Amount);
    }

    [Fact]
    public async Task A_shared_account_counts_for_both_members_and_the_active_household_narrows_it()
    {
        using var pair = await CreateHouseholdPairAsync();
        var other = await Seed.HouseholdAsync(pair.OwnerClient);
        var shared = await CreateAccountAsync("100.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var elsewhere = await CreateAccountAsync("100.00", householdId: other, client: pair.OwnerClient);
        await ExpenseAsync(pair.PartnerClient, shared, "2026-03-04", "10.00", "Iki 0001");
        await ExpenseAsync(pair.OwnerClient, elsewhere, "2026-03-05", "20.00", "IKI 0002");

        var owner = await ReportAsync(pair.OwnerClient, March);
        var partner = await ReportAsync(pair.PartnerClient, March);
        var scoped = await GetScopedAsync<ReportDto>(pair.OwnerClient, $"/api/reports/summary?{March}", pair.HouseholdId);

        Assert.Equal(("iki", "30.00"), OnlyPayee(owner));
        Assert.Equal(("iki", "10.00"), OnlyPayee(partner));
        Assert.Equal(("iki", "10.00"), OnlyPayee(scoped));
    }

    private static (string?, string) OnlyPayee(ReportDto report)
    {
        var payee = Assert.Single(report.ExpenseByPayee);
        return (payee.PayeeKey, payee.Amount);
    }

    private static string Word(int number) => new(number.ToString("00", System.Globalization.CultureInfo.InvariantCulture).Select(digit => (char)('a' + digit - '0')).ToArray());

    private static Task<TransactionDto> ExpenseAsync(HttpClient client, Guid accountId, string date, string amount, string? description) =>
        RecordTransactionAsync(client, new { accountId, type = "expense", amount, date, description });

    private static async Task<ReportDto> ReportAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<ReportDto>($"/api/reports/summary?{query}", TestContext.Current.CancellationToken))!;

    private sealed record PayeeDto(string? PayeeKey, string? Label, string Amount, string? ComparisonAmount, int Count);

    private sealed record ReportDto(string TotalExpense, List<PayeeDto> ExpenseByPayee);
}
