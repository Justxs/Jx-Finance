using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Currencies;

[Collection<IntegrationCollection>]
public sealed class MultiCurrencyEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Currencies_endpoint_reports_the_reporting_currency()
    {
        var currencies = await Client.GetFromJsonAsync<CurrenciesDto>("/api/currencies", TestContext.Current.CancellationToken);

        Assert.Equal("eur", currencies!.ReportingCurrency);
        Assert.Contains("usd", currencies.Currencies);
    }

    [Fact]
    public async Task Exchange_rate_lookup_crosses_through_the_euro()
    {
        var rate = await Client.GetFromJsonAsync<RateDto>("/api/exchange-rates?from=usd&to=gbp&date=2026-06-03", TestContext.Current.CancellationToken);

        Assert.Equal("0.727273", rate!.Rate);
    }

    [Fact]
    public async Task Account_defaults_to_the_reporting_currency()
    {
        var account = await CreateAccountAsync("Default currency", "50.00", null);

        Assert.Equal("eur", account.Currency);
        Assert.Equal("50.00", Assert.Single(account.Balances).Amount);
    }

    [Fact]
    public async Task Foreign_transaction_is_valued_in_the_reporting_currency_on_its_date()
    {
        var account = await CreateAccountAsync("Dollar account", "0.00", "usd");

        var response = await Client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = account.Id, type = "income", amount = "110.00", date = "2026-06-02" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var transaction = await response.Content.ReadFromJsonAsync<TransactionDto>(TestContext.Current.CancellationToken);

        Assert.Equal("usd", transaction!.Currency);
        Assert.Equal("110.00", transaction.Amount);
        Assert.Equal("100.00", transaction.ReportingAmount);

        var reloaded = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{account.Id}", TestContext.Current.CancellationToken);
        Assert.Equal("110.00", reloaded!.CurrentBalance);
        Assert.Equal("100.00", reloaded.ReportingBalance);
    }

    [Fact]
    public async Task Transaction_summary_totals_use_the_reporting_currency()
    {
        var account = await CreateAccountAsync("Summary dollars", "0.00", "usd");
        await Client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = account.Id, type = "expense", amount = "55.00", date = "2026-06-04" }, TestContext.Current.CancellationToken);
        await Client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = account.Id, type = "expense", amount = "10.00", currency = "eur", date = "2026-06-04" }, TestContext.Current.CancellationToken);

        var summary = await Client.GetFromJsonAsync<SummaryDto>($"/api/transactions/summary?accountId={account.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(2, summary!.Count);
        Assert.Equal("60.00", summary.TotalExpense);
    }

    [Fact]
    public async Task Conversion_moves_money_between_currencies_and_books_the_fee()
    {
        var account = await CreateAccountAsync("Broker", "1000.00", "eur");

        var response = await Client.PostAsJsonAsync(
            "/api/conversions",
            new
            {
                accountId = account.Id,
                fromAmount = "500.00",
                fromCurrency = "eur",
                toAmount = "550.00",
                toCurrency = "usd",
                date = "2026-06-05",
                feeAmount = "2.00",
            }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var conversion = await response.Content.ReadFromJsonAsync<ConversionDto>(TestContext.Current.CancellationToken);
        Assert.Equal("1.100000", conversion!.Rate);
        Assert.Equal("2.00", conversion.FeeAmount);
        Assert.Equal("eur", conversion.FeeCurrency);
        Assert.NotNull(conversion.FeeTransactionId);

        var afterConversion = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{account.Id}", TestContext.Current.CancellationToken);
        Assert.Equal("498.00", afterConversion!.Balances.Single(b => b.Currency == "eur").Amount);
        Assert.Equal("550.00", afterConversion.Balances.Single(b => b.Currency == "usd").Amount);
        Assert.Equal("998.00", afterConversion.CurrentBalance);

        var fee = await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{conversion.FeeTransactionId}", TestContext.Current.CancellationToken);
        Assert.Equal("2.00", fee!.Amount);

        var listed = await Client.GetFromJsonAsync<PageDto<ConversionDto>>($"/api/conversions?accountId={account.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(conversion.Id, Assert.Single(listed!.Items).Id);

        var deleteResponse = await Client.DeleteAsync($"/api/conversions/{conversion.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{account.Id}", TestContext.Current.CancellationToken);
        Assert.Equal("1000.00", Assert.Single(afterDelete!.Balances).Amount);
        var feeAfterDelete = await Client.GetAsync($"/api/transactions/{conversion.FeeTransactionId}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, feeAfterDelete.StatusCode);
    }

    [Fact]
    public async Task Conversion_needs_two_different_currencies()
    {
        var account = await CreateAccountAsync("Same currency", "10.00", "eur");

        var response = await Client.PostAsJsonAsync(
            "/api/conversions",
            new
            {
                accountId = account.Id,
                fromAmount = "5.00",
                fromCurrency = "eur",
                toAmount = "5.00",
                toCurrency = "eur",
                date = "2026-06-05",
            }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Conversion_fee_must_use_one_of_the_two_currencies()
    {
        var account = await CreateAccountAsync("Fee currency", "10.00", "eur");

        var response = await Client.PostAsJsonAsync(
            "/api/conversions",
            new
            {
                accountId = account.Id,
                fromAmount = "5.00",
                fromCurrency = "eur",
                toAmount = "5.50",
                toCurrency = "usd",
                date = "2026-06-05",
                feeAmount = "1.00",
                feeCurrency = "gbp",
            }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Transfer_between_currencies_records_both_amounts()
    {
        var euros = await CreateAccountAsync("Euro bank", "300.00", "eur");
        var dollars = await CreateAccountAsync("Dollar bank", "0.00", "usd");

        var missingAmount = await Client.PostAsJsonAsync(
            "/api/transfers",
            new { fromAccountId = euros.Id, toAccountId = dollars.Id, amount = "100.00", date = "2026-06-06" }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.BadRequest, missingAmount.StatusCode);

        var response = await Client.PostAsJsonAsync(
            "/api/transfers",
            new
            {
                fromAccountId = euros.Id,
                toAccountId = dollars.Id,
                amount = "100.00",
                receivedAmount = "108.00",
                date = "2026-06-06",
            }, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var transfer = await response.Content.ReadFromJsonAsync<TransferDto>(TestContext.Current.CancellationToken);
        Assert.Equal("eur", transfer!.Currency);
        Assert.Equal("108.00", transfer.ReceivedAmount);
        Assert.Equal("usd", transfer.ReceivedCurrency);

        var from = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{euros.Id}", TestContext.Current.CancellationToken);
        var to = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{dollars.Id}", TestContext.Current.CancellationToken);
        Assert.Equal("200.00", from!.CurrentBalance);
        Assert.Equal("108.00", to!.CurrentBalance);
    }

    [Fact]
    public async Task Same_currency_transfer_rejects_a_different_received_amount()
    {
        var first = await CreateAccountAsync("Same A", "100.00", "eur");
        var second = await CreateAccountAsync("Same B", "0.00", "eur");

        var response = await Client.PostAsJsonAsync(
            "/api/transfers",
            new
            {
                fromAccountId = first.Id,
                toAccountId = second.Id,
                amount = "10.00",
                receivedAmount = "11.00",
                date = "2026-06-06",
            }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<AccountDto> CreateAccountAsync(string name, string startingBalance, string? currency)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name, type = "other", startingBalance, currency });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<AccountDto>())!;
    }

    private sealed record SummaryDto(int Count, string TotalIncome, string TotalExpense);

    private sealed record ConversionDto(
        Guid Id,
        string Rate,
        string? FeeAmount,
        string? FeeCurrency,
        Guid? FeeTransactionId);

    private sealed record RateDto(string From, string To, string Rate, DateOnly AsOf);
}
