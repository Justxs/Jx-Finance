using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Settings;

[Collection<IntegrationCollection>]
public sealed class SettingsEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Defaults_enable_every_feature()
    {
        var settings = await ReadAsync();

        Assert.True(settings.Features.Budgets);
        Assert.True(settings.Features.MultiCurrency);
        Assert.Equal("eur", settings.ReportingCurrency);
        Assert.Equal(20, settings.DefaultPageSize);
        Assert.Contains("usd", settings.EnabledCurrencies);
    }

    [Fact]
    public async Task Public_settings_need_no_session()
    {
        using var anonymous = CreateClient();

        var response = await anonymous.GetAsync("/api/settings/public", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var full = await anonymous.GetAsync("/api/settings", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized, full.StatusCode);
    }

    [Fact]
    public async Task Disabled_feature_answers_not_found_until_it_is_enabled_again()
    {
        var original = await ReadAsync();
        try
        {
            await SaveAsync(original with { Features = original.Features with { Budgets = false } });

            var blocked = await Client.GetAsync("/api/budgets", TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.NotFound, blocked.StatusCode);
            Assert.Equal("application/problem+json", blocked.Content.Headers.ContentType?.MediaType);
            var problem = await blocked.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
            Assert.Equal(404, problem.GetProperty("status").GetInt32());
            Assert.Equal("/api/budgets", problem.GetProperty("instance").GetString());
            var error = Assert.Single(problem.GetProperty("errors").EnumerateArray());
            Assert.Equal("generalErrors", error.GetProperty("name").GetString());
            Assert.Equal("feature.disabled", error.GetProperty("code").GetString());

            var untouched = await Client.GetAsync("/api/goals", TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, untouched.StatusCode);
        }
        finally
        {
            await SaveAsync(original);
        }

        var restored = await Client.GetAsync("/api/budgets", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, restored.StatusCode);
    }

    [Fact]
    public async Task Households_off_lists_nothing_and_blocks_changes()
    {
        var original = await ReadAsync();
        try
        {
            await SaveAsync(original with { Features = original.Features with { Households = false } });

            var list = await Client.GetAsync("/api/households", TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, list.StatusCode);
            Assert.Equal("[]", await list.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));

            var create = await Client.PostAsJsonAsync("/api/households", new { name = "Blocked" }, TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.NotFound, create.StatusCode);
        }
        finally
        {
            await SaveAsync(original);
        }
    }

    [Fact]
    public async Task Only_enabled_currencies_can_be_used()
    {
        var original = await ReadAsync();
        try
        {
            await SaveAsync(original with { EnabledCurrencies = ["usd"] });

            var currencies = await Client.GetFromJsonAsync<CurrenciesDto>("/api/currencies", TestContext.Current.CancellationToken);
            Assert.Equal(["eur", "usd"], currencies!.Currencies);

            var rejected = await CreateAccountInAsync("Pounds refused", "gbp");
            Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
            var accepted = await CreateAccountInAsync("Dollars allowed", "usd");
            Assert.Equal(HttpStatusCode.Created, accepted.StatusCode);
        }
        finally
        {
            await SaveAsync(original);
        }
    }

    [Fact]
    public async Task Turning_multi_currency_off_leaves_only_the_reporting_currency()
    {
        var original = await ReadAsync();
        try
        {
            await SaveAsync(original with { Features = original.Features with { MultiCurrency = false } });

            var currencies = await Client.GetFromJsonAsync<CurrenciesDto>("/api/currencies", TestContext.Current.CancellationToken);
            Assert.Equal(["eur"], currencies!.Currencies);
            Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync("/api/conversions", TestContext.Current.CancellationToken)).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, (await CreateAccountInAsync("Dollars refused", "usd")).StatusCode);
        }
        finally
        {
            await SaveAsync(original);
        }
    }

    [Fact]
    public async Task Changing_the_reporting_currency_revalues_history()
    {
        var original = await ReadAsync();
        var accountResponse = await CreateAccountInAsync("Revalue dollars", "usd");
        var account = await accountResponse.Content.ReadFromJsonAsync<IdDto>(TestContext.Current.CancellationToken);
        var created = await Client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = account!.Id, type = "income", amount = "110.00", date = "2026-06-10" }, TestContext.Current.CancellationToken);
        var transaction = await created.Content.ReadFromJsonAsync<TransactionDto>(TestContext.Current.CancellationToken);
        Assert.Equal("100.00", transaction!.ReportingAmount);

        try
        {
            await SaveAsync(original with { ReportingCurrency = "usd" });

            var inDollars = await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken);
            Assert.Equal("110.00", inDollars!.ReportingAmount);
        }
        finally
        {
            await SaveAsync(original);
        }

        var inEuros = await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{transaction.Id}", TestContext.Current.CancellationToken);
        Assert.Equal("100.00", inEuros!.ReportingAmount);
    }

    [Fact]
    public async Task Revaluation_covers_every_row_when_history_spans_several_batches()
    {
        var original = await ReadAsync();
        var dollars = (await (await CreateAccountInAsync("Batch dollars", "usd")).Content.ReadFromJsonAsync<IdDto>(TestContext.Current.CancellationToken))!.Id;
        var euros = (await (await CreateAccountInAsync("Batch euros", "eur")).Content.ReadFromJsonAsync<IdDto>(TestContext.Current.CancellationToken))!.Id;
        var inDollars = new List<Guid>();
        for (var i = 1; i <= 8; i++)
        {
            inDollars.Add((await PostAsync<IdDto>(
                Client,
                "/api/transactions",
                new { accountId = dollars, type = "expense", amount = $"{i * 11}.00", date = $"2026-06-{i:00}" })).Id);
        }

        var inEuros = (await PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new { accountId = euros, type = "expense", amount = "10.00", date = "2026-06-10" })).Id;
        var deleted = inDollars[0];
        (await Client.DeleteAsync($"/api/transactions/{deleted}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        try
        {
            await SaveAsync(original with { ReportingCurrency = "usd" });

            for (var i = 2; i <= 8; i++)
            {
                Assert.Equal($"{i * 11}.00", await ReportingAmountAsync(inDollars[i - 1]));
            }

            Assert.Equal("11.00", await ReportingAmountAsync(inEuros));
            Assert.Equal(11.00m, await StoredReportingAmountAsync(deleted));
        }
        finally
        {
            await SaveAsync(original);
        }

        for (var i = 2; i <= 8; i++)
        {
            Assert.Equal($"{i * 10}.00", await ReportingAmountAsync(inDollars[i - 1]));
        }

        Assert.Equal("10.00", await ReportingAmountAsync(inEuros));
        Assert.Equal(10.00m, await StoredReportingAmountAsync(deleted));
    }

    private async Task<string> ReportingAmountAsync(Guid id) =>
        (await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{id}"))!.ReportingAmount;

    private async Task<decimal> StoredReportingAmountAsync(Guid id)
    {
        await using var connection = new Npgsql.NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new Npgsql.NpgsqlCommand("SELECT \"ReportingAmount\" FROM \"Transactions\" WHERE \"Id\" = $1", connection);
        command.Parameters.AddWithValue(id);
        return (decimal)(await command.ExecuteScalarAsync())!;
    }

    [Fact]
    public async Task Invalid_values_are_rejected()
    {
        var original = await ReadAsync();

        var badZone = await Client.PutAsJsonAsync("/api/settings", original with { TimeZone = "Mars/Olympus" }, TestContext.Current.CancellationToken);
        var badPageSize = await Client.PutAsJsonAsync("/api/settings", original with { DefaultPageSize = 7 }, TestContext.Current.CancellationToken);
        var badAccount = await Client.PutAsJsonAsync("/api/settings", original with { DefaultAccountId = Guid.NewGuid() }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, badZone.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, badPageSize.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, badAccount.StatusCode);
    }

    [Fact]
    public async Task Saved_values_are_returned_and_trimmed()
    {
        var original = await ReadAsync();
        try
        {
            var saved = await SaveAsync(original with
            {
                InstanceName = "  Pranauskai  ",
                DefaultLanguage = "lt",
                FirstDayOfWeek = "sunday",
                DefaultPageSize = 50,
            });

            Assert.Equal("Pranauskai", saved.InstanceName);
            Assert.Equal("lt", saved.DefaultLanguage);
            Assert.Equal("sunday", saved.FirstDayOfWeek);
            Assert.Equal(50, saved.DefaultPageSize);
        }
        finally
        {
            await SaveAsync(original);
        }
    }

    [Fact]
    public async Task Manual_sync_reports_the_newest_rate_date()
    {
        var response = await Client.PostAsync("/api/settings/exchange-rates/sync", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<SyncDto>(TestContext.Current.CancellationToken);
        Assert.NotNull(result!.RatesAsOf);
    }

    private async Task<SettingsDto> ReadAsync() =>
        (await Client.GetFromJsonAsync<SettingsDto>("/api/settings"))!;

    private async Task<SettingsDto> SaveAsync(SettingsDto settings)
    {
        var response = await Client.PutAsJsonAsync("/api/settings", settings);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<SettingsDto>())!;
    }

    private Task<HttpResponseMessage> CreateAccountInAsync(string name, string currency) =>
        Client.PostAsJsonAsync("/api/accounts", new { name, type = "other", startingBalance = "0.00", currency });

    private sealed record FeaturesDto(
        bool Budgets,
        bool Goals,
        bool RecurringBills,
        bool NetWorth,
        bool Reports,
        bool Import,
        bool Households,
        bool MultiCurrency,
        bool Investments);

    private sealed record SettingsDto(
        string? InstanceName,
        FeaturesDto Features,
        string ReportingCurrency,
        IReadOnlyList<string> EnabledCurrencies,
        bool ExchangeRateSyncEnabled,
        string DefaultLanguage,
        string TimeZone,
        string FirstDayOfWeek,
        Guid? DefaultAccountId,
        int DefaultPageSize);

    private sealed record SyncDto(int Added, DateOnly? RatesAsOf);
}
