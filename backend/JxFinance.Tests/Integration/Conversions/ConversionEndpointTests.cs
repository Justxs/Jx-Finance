using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Conversions;

[Collection<IntegrationCollection>]
public sealed class ConversionEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Theory]
    [InlineData(null, "eur", "497.50", "550.00", "2.50")]
    [InlineData("eur", "eur", "497.50", "550.00", "2.50")]
    [InlineData("usd", "usd", "500.00", "547.50", "2.27")]
    public async Task Fee_is_booked_as_an_expense_in_the_chosen_currency(
        string? feeCurrency,
        string bookedCurrency,
        string eurosLeft,
        string dollarsHeld,
        string feeInReportingCurrency)
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", currency: "eur", client: member);
        var category = await CreateCategoryAsync(client: member);

        var conversion = await PostAsync<ConversionDto>(
            member,
            "/api/conversions",
            new
            {
                accountId = account,
                fromAmount = "500.00",
                fromCurrency = "eur",
                toAmount = "550.00",
                toCurrency = "usd",
                date = "2026-06-05",
                feeAmount = "2.50",
                feeCurrency,
                feeCategoryId = category,
            });

        Assert.Equal(("2.50", bookedCurrency), (conversion.FeeAmount, conversion.FeeCurrency));
        var balances = (await member.GetFromJsonAsync<AccountDto>($"/api/accounts/{account}"))!.Balances;
        Assert.Equal(eurosLeft, balances.Single(b => b.Currency == "eur").Amount);
        Assert.Equal(dollarsHeld, balances.Single(b => b.Currency == "usd").Amount);
        var fee = await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{conversion.FeeTransactionId}");
        Assert.Equal(
            new TransactionDto(conversion.FeeTransactionId!.Value, account, category, "expense", "2.50", bookedCurrency, feeInReportingCurrency),
            fee);
    }

    [Fact]
    public async Task Conversion_without_a_fee_books_no_transaction()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", currency: "eur", client: member);

        var conversion = await CreateAsync(member, account);

        Assert.Null(conversion.FeeTransactionId);
        Assert.Null(conversion.FeeAmount);
        Assert.Equal(0, (await member.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?accountId={account}"))!.Total);
    }

    [Fact]
    public async Task Deleting_a_conversion_removes_its_fee_transaction_and_restores_the_balances()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", currency: "eur", client: member);
        var conversion = await CreateAsync(member, account, feeAmount: "3.00", feeCurrency: "usd");

        var delete = await member.DeleteAsync($"/api/conversions/{conversion.Id}");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await member.GetAsync($"/api/transactions/{conversion.FeeTransactionId}")).StatusCode);
        Assert.Equal(0, (await member.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?accountId={account}"))!.Total);
        Assert.Empty((await member.GetFromJsonAsync<PageDto<ConversionDto>>($"/api/conversions?accountId={account}"))!.Items);
        var balance = Assert.Single((await member.GetFromJsonAsync<AccountDto>($"/api/accounts/{account}"))!.Balances);
        Assert.Equal(new BalanceDto("eur", "1000.00"), balance);
        Assert.Equal(HttpStatusCode.NotFound, (await member.DeleteAsync($"/api/conversions/{conversion.Id}")).StatusCode);
    }

    [Fact]
    public async Task Conversions_follow_the_visibility_of_their_account()
    {
        var partner = await CreateUserAsync();
        using var partnerClient = await LoginAsync(partner);
        using var stranger = await CreateUserClientAsync();
        var household = await CreateHouseholdAsync(partner);
        var shared = await CreateAccountAsync("1000.00", currency: "eur", householdId: household);
        var personal = await CreateAccountAsync("1000.00", currency: "eur");
        var onShared = await CreateAsync(Client, shared, feeAmount: "1.00");
        var onPersonal = await CreateAsync(Client, personal, feeAmount: "1.00");

        var partnerSees = (await partnerClient.GetFromJsonAsync<PageDto<ConversionDto>>("/api/conversions?pageSize=200"))!.Items;
        var strangerSees = (await stranger.GetFromJsonAsync<PageDto<ConversionDto>>("/api/conversions?pageSize=200"))!.Items;
        var strangerCreates = await stranger.PostAsJsonAsync("/api/conversions", Body(personal, null, null));
        var strangerDeletes = await stranger.DeleteAsync($"/api/conversions/{onShared.Id}");
        var partnerDeletesHidden = await partnerClient.DeleteAsync($"/api/conversions/{onPersonal.Id}");

        Assert.Equal([onShared.Id], partnerSees.Select(c => c.Id));
        Assert.Empty(strangerSees);
        Assert.Equal(HttpStatusCode.BadRequest, strangerCreates.StatusCode);
        Assert.Contains("reference.notFound", await strangerCreates.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.NotFound, strangerDeletes.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, partnerDeletesHidden.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync($"/api/transactions/{onPersonal.FeeTransactionId}")).StatusCode);
    }

    [Fact]
    public async Task Conversions_answer_feature_disabled_while_multi_currency_is_off()
    {
        var account = await CreateAccountAsync("1000.00", currency: "eur");
        var existing = await CreateAsync(Client, account);
        var original = (await Client.GetFromJsonAsync<JsonObject>("/api/settings"))!;
        var switchedOff = original.DeepClone().AsObject();
        switchedOff["features"]!["multiCurrency"] = false;

        try
        {
            (await Client.PutAsJsonAsync("/api/settings", switchedOff)).EnsureSuccessStatusCode();

            var list = await Client.GetAsync("/api/conversions");
            var create = await Client.PostAsJsonAsync("/api/conversions", Body(account, null, null));
            var delete = await Client.DeleteAsync($"/api/conversions/{existing.Id}");

            foreach (var response in new[] { list, create, delete })
            {
                await AssertProblemAsync(response, HttpStatusCode.NotFound, "feature.disabled");
            }
        }
        finally
        {
            (await Client.PutAsJsonAsync("/api/settings", original)).EnsureSuccessStatusCode();
        }

        var listed = await Client.GetFromJsonAsync<PageDto<ConversionDto>>($"/api/conversions?accountId={account}");
        Assert.Equal(existing.Id, Assert.Single(listed!.Items).Id);
    }

    private static Task<ConversionDto> CreateAsync(HttpClient client, Guid accountId, string? feeAmount = null, string? feeCurrency = null) =>
        PostAsync<ConversionDto>(client, "/api/conversions", Body(accountId, feeAmount, feeCurrency));

    private static object Body(Guid accountId, string? feeAmount, string? feeCurrency) => new
    {
        accountId,
        fromAmount = "500.00",
        fromCurrency = "eur",
        toAmount = "550.00",
        toCurrency = "usd",
        date = "2026-06-05",
        feeAmount,
        feeCurrency,
    };

    private sealed record ConversionDto(Guid Id, string? FeeAmount, string? FeeCurrency, Guid? FeeTransactionId);

    private sealed record TransactionDto(
        Guid Id,
        Guid AccountId,
        Guid? CategoryId,
        string Type,
        string Amount,
        string Currency,
        string ReportingAmount);
}
