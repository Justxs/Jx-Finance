using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Conversions;

[Collection<IntegrationCollection>]
public sealed class ConversionUpdateTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Update_replaces_amounts_currencies_date_and_description()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", currency: "eur", client: member);
        var conversion = await CreateAsync(member, account);

        var response = await member.PutAsJsonAsync(
            $"/api/conversions/{conversion.Id}",
            Body("400.00", "eur", "300.00", "gbp", "2026-07-01", description: "  Pounds for the trip  "), TestContext.Current.CancellationToken);

        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<ConversionDto>(TestContext.Current.CancellationToken);
        Assert.Equal(
            new ConversionDto(conversion.Id, account, "400.00", "eur", "300.00", "gbp", "0.750000", new DateOnly(2026, 7, 1), "Pounds for the trip", null, null, null, null, false),
            updated);
        Assert.Equal([new BalanceDto("eur", "600.00"), new BalanceDto("gbp", "300.00")], await BalancesAsync(member, account));
        var listed = await member.GetFromJsonAsync<PageDto<ConversionDto>>($"/api/conversions?accountId={account}", TestContext.Current.CancellationToken);
        Assert.Equal(updated, Assert.Single(listed!.Items));
    }

    [Fact]
    public async Task Adding_a_fee_books_the_expense_at_the_rate_of_the_new_date()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", currency: "eur", client: member);
        var category = await CreateCategoryAsync(client: member);
        var conversion = await CreateAsync(member, account);

        var response = await member.PutAsJsonAsync(
            $"/api/conversions/{conversion.Id}",
            Body("500.00", "eur", "550.00", "usd", "2026-06-20", "2.50", "usd", category), TestContext.Current.CancellationToken);

        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<ConversionDto>(TestContext.Current.CancellationToken);
        Assert.Equal(("2.50", "usd", category), (updated!.FeeAmount, updated.FeeCurrency, updated.FeeCategoryId));
        var fee = await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{updated.FeeTransactionId}", TestContext.Current.CancellationToken);
        Assert.Equal(
            new TransactionDto(updated.FeeTransactionId!.Value, account, category, "expense", "2.50", "usd", "2.27", new DateOnly(2026, 6, 20), "Conversion fee EUR to USD"),
            fee);
        Assert.Equal([new BalanceDto("eur", "500.00"), new BalanceDto("usd", "547.50")], await BalancesAsync(member, account));
    }

    [Fact]
    public async Task Changing_the_fee_updates_the_same_transaction_in_amount_currency_date_and_value()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", currency: "eur", client: member);
        var conversion = await CreateAsync(member, account, "2.50", "eur");

        var response = await member.PutAsJsonAsync(
            $"/api/conversions/{conversion.Id}",
            Body("500.00", "eur", "400.00", "gbp", "2026-07-01", "0.80", "gbp"), TestContext.Current.CancellationToken);

        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<ConversionDto>(TestContext.Current.CancellationToken);
        Assert.Equal(conversion.FeeTransactionId, updated!.FeeTransactionId);
        var fee = await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{updated.FeeTransactionId}", TestContext.Current.CancellationToken);
        Assert.Equal(
            new TransactionDto(conversion.FeeTransactionId!.Value, account, null, "expense", "0.80", "gbp", "1.00", new DateOnly(2026, 7, 1), "Conversion fee EUR to GBP"),
            fee);
        Assert.Equal(1, (await member.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?accountId={account}", TestContext.Current.CancellationToken))!.Total);
        Assert.Equal([new BalanceDto("eur", "500.00"), new BalanceDto("gbp", "399.20")], await BalancesAsync(member, account));
    }

    [Fact]
    public async Task Removing_the_fee_deletes_its_transaction()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", currency: "eur", client: member);
        var conversion = await CreateAsync(member, account, "3.00", "usd");

        var response = await member.PutAsJsonAsync($"/api/conversions/{conversion.Id}", Body("500.00", "eur", "550.00", "usd", "2026-06-05"), TestContext.Current.CancellationToken);

        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<ConversionDto>(TestContext.Current.CancellationToken);
        Assert.Null(updated!.FeeAmount);
        Assert.Null(updated.FeeCurrency);
        Assert.Null(updated.FeeTransactionId);
        Assert.Equal(HttpStatusCode.NotFound, (await member.GetAsync($"/api/transactions/{conversion.FeeTransactionId}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(0, (await member.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?accountId={account}", TestContext.Current.CancellationToken))!.Total);
        Assert.Equal([new BalanceDto("eur", "500.00"), new BalanceDto("usd", "550.00")], await BalancesAsync(member, account));
    }

    [Fact]
    public async Task A_fee_the_user_deleted_is_booked_again_and_a_renamed_one_keeps_its_name()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", currency: "eur", client: member);
        var deleted = await CreateAsync(member, account, "2.00", "eur");
        var renamed = await CreateAsync(member, account, "2.00", "eur");
        (await member.DeleteAsync($"/api/transactions/{deleted.FeeTransactionId}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await member.PutAsJsonAsync(
            $"/api/transactions/{renamed.FeeTransactionId}",
            new { accountId = account, type = "expense", amount = "2.00", date = "2026-06-05", description = "Bank charge" }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var rebooked = await PutAsync(member, deleted.Id, Body("500.00", "eur", "400.00", "gbp", "2026-06-05", "1.00", "eur"));
        var kept = await PutAsync(member, renamed.Id, Body("500.00", "eur", "400.00", "gbp", "2026-06-05", "1.00", "eur"));

        Assert.NotEqual(deleted.FeeTransactionId, rebooked.FeeTransactionId);
        Assert.Equal("1.00", (await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{rebooked.FeeTransactionId}", TestContext.Current.CancellationToken))!.Amount);
        Assert.Equal(renamed.FeeTransactionId, kept.FeeTransactionId);
        Assert.Equal("Bank charge", (await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{kept.FeeTransactionId}", TestContext.Current.CancellationToken))!.Description);
    }

    [Fact]
    public async Task A_split_fee_cannot_be_changed_from_the_conversion()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", currency: "eur", client: member);
        var first = await CreateCategoryAsync(client: member);
        var second = await CreateCategoryAsync(client: member);
        var conversion = await CreateAsync(member, account, "2.00", "eur");
        (await member.PutAsJsonAsync(
            $"/api/transactions/{conversion.FeeTransactionId}",
            new
            {
                accountId = account,
                type = "expense",
                amount = "2.00",
                date = "2026-06-05",
                lines = new[] { new { categoryId = first, amount = "1.50" }, new { categoryId = second, amount = "0.50" } },
            }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var newFee = await member.PutAsJsonAsync($"/api/conversions/{conversion.Id}", Body("500.00", "eur", "550.00", "usd", "2026-06-05", "3.00", "eur"), TestContext.Current.CancellationToken);
        var newDate = await member.PutAsJsonAsync($"/api/conversions/{conversion.Id}", Body("500.00", "eur", "550.00", "usd", "2026-06-06", "2.00", "eur"), TestContext.Current.CancellationToken);
        var noFee = await member.PutAsJsonAsync($"/api/conversions/{conversion.Id}", Body("500.00", "eur", "550.00", "usd", "2026-06-05"), TestContext.Current.CancellationToken);
        var amountsOnly = await member.PutAsJsonAsync($"/api/conversions/{conversion.Id}", Body("500.00", "eur", "560.00", "usd", "2026-06-05", "2.00", "eur"), TestContext.Current.CancellationToken);

        foreach (var refused in new[] { newFee, newDate, noFee })
        {
            await AssertRejectedAsync(refused, "transaction.splitNotAllowed");
        }

        amountsOnly.EnsureSuccessStatusCode();
        var fee = await member.GetFromJsonAsync<JsonElement>($"/api/transactions/{conversion.FeeTransactionId}", TestContext.Current.CancellationToken);
        Assert.True(fee.GetProperty("isSplit").GetBoolean());
        Assert.Equal(2, fee.GetProperty("lines").GetArrayLength());
        Assert.Equal([new BalanceDto("eur", "498.00"), new BalanceDto("usd", "560.00")], await BalancesAsync(member, account));

        (await member.DeleteAsync($"/api/conversions/{conversion.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound, (await member.GetAsync($"/api/transactions/{conversion.FeeTransactionId}", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task A_conversion_imported_from_a_broker_is_read_only()
    {
        var broker = await CreateAccountAsync("0.00", "investment", "eur");
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes(SampleFlexReport.Xml));
        file.Headers.ContentType = new MediaTypeHeaderValue("text/xml");
        using var form = new MultipartFormDataContent { { file, "file", "flex.xml" }, { new StringContent(broker.ToString()), "accountId" } };
        (await Client.PostAsync("/api/investments/import/interactive-brokers", form, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var imported = Assert.Single((await Client.GetFromJsonAsync<PageDto<ConversionDto>>($"/api/conversions?accountId={broker}", TestContext.Current.CancellationToken))!.Items);
        Assert.True(imported.IsImported);

        var response = await Client.PutAsJsonAsync($"/api/conversions/{imported.Id}", Body("400.00", "eur", "440.00", "usd", "2026-06-03"), TestContext.Current.CancellationToken);

        await AssertRejectedAsync(response, "resource.readOnly");
        var unchanged = Assert.Single((await Client.GetFromJsonAsync<PageDto<ConversionDto>>($"/api/conversions?accountId={broker}", TestContext.Current.CancellationToken))!.Items);
        Assert.Equal(imported, unchanged);
    }

    [Fact]
    public async Task Update_follows_the_visibility_of_the_account()
    {
        var partner = await CreateUserAsync();
        using var partnerClient = await LoginAsync(partner);
        using var stranger = await CreateUserClientAsync();
        var household = await CreateHouseholdAsync(partner);
        var shared = await CreateAccountAsync("1000.00", currency: "eur", householdId: household);
        var personal = await CreateAccountAsync("1000.00", currency: "eur");
        var onShared = await CreateAsync(Client, shared);
        var onPersonal = await CreateAsync(Client, personal);
        var body = Body("100.00", "eur", "110.00", "usd", "2026-06-05", "1.00", "eur");

        var byStranger = await stranger.PutAsJsonAsync($"/api/conversions/{onShared.Id}", body, TestContext.Current.CancellationToken);
        var hiddenFromPartner = await partnerClient.PutAsJsonAsync($"/api/conversions/{onPersonal.Id}", body, TestContext.Current.CancellationToken);
        var byPartner = await partnerClient.PutAsJsonAsync($"/api/conversions/{onShared.Id}", body, TestContext.Current.CancellationToken);
        var unknown = await Client.PutAsJsonAsync($"/api/conversions/{Guid.NewGuid()}", body, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, byStranger.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, hiddenFromPartner.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        byPartner.EnsureSuccessStatusCode();
        var fee = (await byPartner.Content.ReadFromJsonAsync<ConversionDto>(TestContext.Current.CancellationToken))!.FeeTransactionId;
        Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync($"/api/transactions/{fee}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal([new BalanceDto("eur", "899.00"), new BalanceDto("usd", "110.00")], await BalancesAsync(Client, shared));
    }

    [Fact]
    public async Task Invalid_input_is_reported_and_changes_nothing()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", currency: "eur", client: member);
        var income = await CreateCategoryAsync("income", member);
        var conversion = await CreateAsync(member, account, "2.00", "eur");

        var sameCurrency = await member.PutAsJsonAsync($"/api/conversions/{conversion.Id}", Body("500.00", "eur", "550.00", "eur", "2026-06-05"), TestContext.Current.CancellationToken);
        var zeroAmount = await member.PutAsJsonAsync($"/api/conversions/{conversion.Id}", Body("0.00", "eur", "550.00", "usd", "2026-06-05"), TestContext.Current.CancellationToken);
        var zeroFee = await member.PutAsJsonAsync($"/api/conversions/{conversion.Id}", Body("500.00", "eur", "550.00", "usd", "2026-06-05", "0.00", "eur"), TestContext.Current.CancellationToken);
        var foreignFee = await member.PutAsJsonAsync($"/api/conversions/{conversion.Id}", Body("500.00", "eur", "550.00", "usd", "2026-06-05", "1.00", "gbp"), TestContext.Current.CancellationToken);
        var wrongCategory = await member.PutAsJsonAsync($"/api/conversions/{conversion.Id}", Body("500.00", "eur", "550.00", "usd", "2026-06-05", "1.00", "eur", income), TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(sameCurrency, "toCurrency");
        await AssertValidationErrorAsync(zeroAmount, "fromAmount");
        await AssertValidationErrorAsync(zeroFee, "feeAmount");
        await AssertValidationErrorAsync(foreignFee, "feeCurrency");
        await AssertRejectedAsync(wrongCategory, "category.wrongType");
        Assert.Equal([new BalanceDto("eur", "498.00"), new BalanceDto("usd", "550.00")], await BalancesAsync(member, account));
    }

    [Fact]
    public async Task Update_respects_the_feature_switch_and_the_enabled_currencies()
    {
        var account = await CreateAccountAsync("1000.00", currency: "eur");
        var pounds = await CreateAsync(Client, account, body: Body("100.00", "eur", "80.00", "gbp", "2026-06-05"));
        var dollars = await CreateAsync(Client, account);
        var original = (await Client.GetFromJsonAsync<JsonObject>("/api/settings", TestContext.Current.CancellationToken))!;
        var restricted = original.DeepClone().AsObject();
        restricted["enabledCurrencies"] = new JsonArray("usd");
        var switchedOff = original.DeepClone().AsObject();
        switchedOff["features"]!["multiCurrency"] = false;

        try
        {
            (await Client.PutAsJsonAsync("/api/settings", restricted, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
            var kept = await Client.PutAsJsonAsync($"/api/conversions/{pounds.Id}", Body("200.00", "eur", "160.00", "gbp", "2026-06-05"), TestContext.Current.CancellationToken);
            var introduced = await Client.PutAsJsonAsync($"/api/conversions/{dollars.Id}", Body("100.00", "eur", "80.00", "gbp", "2026-06-05"), TestContext.Current.CancellationToken);
            kept.EnsureSuccessStatusCode();
            await AssertRejectedAsync(introduced, "currency.disabled");

            (await Client.PutAsJsonAsync("/api/settings", switchedOff, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
            var gated = await Client.PutAsJsonAsync($"/api/conversions/{dollars.Id}", Body("100.00", "eur", "110.00", "usd", "2026-06-05"), TestContext.Current.CancellationToken);
            await AssertProblemAsync(gated, HttpStatusCode.NotFound, "feature.disabled");
        }
        finally
        {
            (await Client.PutAsJsonAsync("/api/settings", original, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        }
    }

    private static Task<ConversionDto> CreateAsync(
        HttpClient client,
        Guid accountId,
        string? feeAmount = null,
        string? feeCurrency = null,
        JsonObject? body = null)
    {
        var request = body ?? Body("500.00", "eur", "550.00", "usd", "2026-06-05", feeAmount, feeCurrency);
        request["accountId"] = accountId;
        return PostAsync<ConversionDto>(client, "/api/conversions", request);
    }

    private static async Task<ConversionDto> PutAsync(HttpClient client, Guid id, JsonObject body)
    {
        var response = await client.PutAsJsonAsync($"/api/conversions/{id}", body);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<ConversionDto>())!;
    }

    private static JsonObject Body(
        string fromAmount,
        string fromCurrency,
        string toAmount,
        string toCurrency,
        string date,
        string? feeAmount = null,
        string? feeCurrency = null,
        Guid? feeCategoryId = null,
        string? description = null) => new()
        {
            ["fromAmount"] = fromAmount,
            ["fromCurrency"] = fromCurrency,
            ["toAmount"] = toAmount,
            ["toCurrency"] = toCurrency,
            ["date"] = date,
            ["description"] = description,
            ["feeAmount"] = feeAmount,
            ["feeCurrency"] = feeCurrency,
            ["feeCategoryId"] = feeCategoryId,
        };

    private static async Task<List<BalanceDto>> BalancesAsync(HttpClient client, Guid account) =>
        (await client.GetFromJsonAsync<AccountDto>($"/api/accounts/{account}"))!.Balances.OrderBy(b => b.Currency).ToList();

    private sealed record ConversionDto(
        Guid Id,
        Guid AccountId,
        string FromAmount,
        string FromCurrency,
        string ToAmount,
        string ToCurrency,
        string Rate,
        DateOnly Date,
        string? Description,
        string? FeeAmount,
        string? FeeCurrency,
        Guid? FeeTransactionId,
        Guid? FeeCategoryId,
        bool IsImported);

    private sealed record TransactionDto(
        Guid Id,
        Guid AccountId,
        Guid? CategoryId,
        string Type,
        string Amount,
        string Currency,
        string ReportingAmount,
        DateOnly Date,
        string? Description);
}
