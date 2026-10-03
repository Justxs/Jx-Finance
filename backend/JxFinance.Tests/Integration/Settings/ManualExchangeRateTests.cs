using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Settings;

[Collection<InvestmentsCollection>]
public sealed class ManualExchangeRateTests(InvestmentsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Url = "/api/settings/exchange-rates";

    [Fact]
    public async Task A_rate_entered_by_hand_revalues_its_currency_from_its_date_and_deleting_it_falls_back()
    {
        var pounds = await CreateAccountAsync(currency: "gbp");
        var dollars = await CreateAccountAsync(currency: "usd");
        var before = await CreateTransactionAsync(Client, pounds, null, "expense", "80.00", "2023-05-09");
        var onTheDay = await CreateTransactionAsync(Client, pounds, null, "expense", "80.00", "2023-05-10");
        var otherCurrency = await CreateTransactionAsync(Client, dollars, null, "expense", "110.00", "2023-05-10");
        await WithDbAsync(db => db.Database.ExecuteSqlAsync(
            $"""INSERT INTO "ExchangeRates" ("Date", "Currency", "Rate") VALUES ({new DateOnly(2023, 5, 10)}, 'GBP', 0.80), ({new DateOnly(2023, 5, 12)}, 'GBP', 0.80) ON CONFLICT DO NOTHING""",
            TestContext.Current.CancellationToken));
        var afterNextRate = await CreateTransactionAsync(Client, pounds, null, "expense", "80.00", "2023-05-12");
        Assert.Equal("100.00", onTheDay.ReportingAmount);

        try
        {
            var saved = await Client.PutAsJsonAsync($"{Url}/gbp/2023-05-10", new { rate = "0.50" }, TestContext.Current.CancellationToken);
            var entry = await ReadOkAsync<EntryDto>(saved);
            var added = await CreateTransactionAsync(Client, pounds, null, "expense", "40.00", "2023-05-10");

            Assert.Equal(("0.5", "manual", "0.8"), (entry.Rate, entry.Source, entry.SyncedRate));
            Assert.Equal(160.00m, await StoredReportingAmountAsync(onTheDay.Id));
            Assert.Equal(100.00m, await StoredReportingAmountAsync(before.Id));
            Assert.Equal(100.00m, await StoredReportingAmountAsync(otherCurrency.Id));
            Assert.Equal(100.00m, await StoredReportingAmountAsync(afterNextRate.Id));
            Assert.Equal("80.00", added.ReportingAmount);
            var listed = await Client.GetFromJsonAsync<List<EntryDto>>($"{Url}?currency=gbp", TestContext.Current.CancellationToken);
            Assert.Contains(listed!, row => row is { Date: "2023-05-10", Source: "manual", Rate: "0.5" });

            var deleted = await Client.DeleteAsync($"{Url}/gbp/2023-05-10", TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
            Assert.Equal(100.00m, await StoredReportingAmountAsync(onTheDay.Id));
            Assert.Equal(50.00m, await StoredReportingAmountAsync(added.Id));
        }
        finally
        {
            await Client.DeleteAsync($"{Url}/gbp/2023-05-10", TestContext.Current.CancellationToken);
        }
    }

    [Fact]
    public async Task Editing_a_rate_entered_by_hand_replaces_it()
    {
        var pounds = await CreateAccountAsync(currency: "gbp");
        var row = await CreateTransactionAsync(Client, pounds, null, "income", "80.00", "2023-06-14");

        try
        {
            (await Client.PutAsJsonAsync($"{Url}/gbp/2023-06-14", new { rate = "0.40" }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
            (await Client.PutAsJsonAsync($"{Url}/gbp/2023-06-14", new { rate = "1.60" }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

            Assert.Equal(50.00m, await StoredReportingAmountAsync(row.Id));
            Assert.Equal(1, await SqlValueAsync<int>($"""SELECT COUNT(*)::int AS "Value" FROM "ManualExchangeRates" WHERE "Currency" = 'GBP' AND "Date" = {new DateOnly(2023, 6, 14)}"""));
        }
        finally
        {
            await Client.DeleteAsync($"{Url}/gbp/2023-06-14", TestContext.Current.CancellationToken);
        }
    }

    [Fact]
    public async Task Invalid_rates_are_refused_with_their_codes()
    {
        var future = Today.AddDays(1).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);

        await AssertProblemAsync(
            await Client.PutAsJsonAsync($"{Url}/usd/2023-05-10", new { rate = "0" }, TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "exchangeRate.notPositive");
        await AssertProblemAsync(
            await Client.PutAsJsonAsync($"{Url}/eur/2023-05-10", new { rate = "1.00" }, TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "exchangeRate.unsupportedCurrency");
        await AssertProblemAsync(
            await Client.PutAsJsonAsync($"{Url}/usd/{future}", new { rate = "1.10" }, TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "exchangeRate.futureDate");
        await AssertProblemAsync(
            await Client.DeleteAsync($"{Url}/usd/2001-01-01", TestContext.Current.CancellationToken),
            HttpStatusCode.NotFound,
            "resource.notFound");
    }

    [Fact]
    public async Task A_member_is_refused_every_rate_route()
    {
        using var member = await CreateUserClientAsync();

        var responses = new[]
        {
            await member.GetAsync($"{Url}?currency=usd", TestContext.Current.CancellationToken),
            await member.PutAsJsonAsync($"{Url}/usd/2023-05-10", new { rate = "1.10" }, TestContext.Current.CancellationToken),
            await member.DeleteAsync($"{Url}/usd/2023-05-10", TestContext.Current.CancellationToken),
        };

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode));
    }

    private Task<decimal> StoredReportingAmountAsync(Guid id) =>
        SqlValueAsync<decimal>($"""SELECT "ReportingAmount" AS "Value" FROM "Transactions" WHERE "Id" = {id}""");

    private sealed record EntryDto(string Date, string Currency, string Rate, string Source, string? SyncedRate);
}
