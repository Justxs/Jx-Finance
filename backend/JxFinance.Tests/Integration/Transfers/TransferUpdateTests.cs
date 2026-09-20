using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transfers;

[Collection<IntegrationCollection>]
public sealed class TransferUpdateTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Update_moves_the_money_to_the_new_accounts_date_and_amount()
    {
        using var member = await CreateUserClientAsync();
        var first = await CreateAccountAsync("100.00", client: member);
        var second = await CreateAccountAsync("100.00", client: member);
        var third = await CreateAccountAsync("50.00", client: member);
        var fourth = await CreateAccountAsync("0.00", client: member);
        var transfer = await CreateAsync(member, first, second, "20.00");

        var response = await member.PutAsJsonAsync(
            $"/api/transfers/{transfer.Id}",
            new { fromAccountId = third, toAccountId = fourth, amount = "30.00", date = "2026-08-15", description = "  Moved  " });

        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<TransferDto>();
        Assert.Equal(
            (transfer.Id, third, fourth, "30.00", new DateOnly(2026, 8, 15), "Moved"),
            (updated!.Id, updated.FromAccountId, updated.ToAccountId, updated.Amount, updated.Date, updated.Description));
        Assert.Equal(("eur", "30.00", "eur"), (updated.Currency, updated.ReceivedAmount, updated.ReceivedCurrency));
        Assert.False(updated.FromAccountImported || updated.ToAccountImported);
        Assert.Equal("100.00", await CurrentBalanceAsync(first, member));
        Assert.Equal("100.00", await CurrentBalanceAsync(second, member));
        Assert.Equal("20.00", await CurrentBalanceAsync(third, member));
        Assert.Equal("30.00", await CurrentBalanceAsync(fourth, member));
        var listed = await member.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?date=2026-08-15");
        Assert.Equal(transfer.Id, Assert.Single(listed!.Items).Id);
    }

    [Fact]
    public async Task Cross_currency_rules_are_those_of_create()
    {
        using var member = await CreateUserClientAsync();
        var euros = await CreateAccountAsync("300.00", currency: "eur", client: member);
        var dollars = await CreateAccountAsync("5.00", currency: "usd", client: member);
        var moreEuros = await CreateAccountAsync("0.00", currency: "eur", client: member);
        var transfer = await CreateAsync(member, euros, dollars, "100.00", receivedAmount: "108.50");

        var withoutReceived = await member.PutAsJsonAsync(
            $"/api/transfers/{transfer.Id}",
            new { fromAccountId = euros, toAccountId = dollars, amount = "120.00", date = "2026-09-01" });
        var repriced = await member.PutAsJsonAsync(
            $"/api/transfers/{transfer.Id}",
            new { fromAccountId = euros, toAccountId = dollars, amount = "120.00", receivedAmount = "130.20", date = "2026-09-01" });

        await AssertRejectedAsync(withoutReceived, "transfer.receivedAmountRequired");
        repriced.EnsureSuccessStatusCode();
        Assert.Equal("180.00", await CurrentBalanceAsync(euros, member));
        Assert.Equal("135.20", await CurrentBalanceAsync(dollars, member));

        var mismatch = await member.PutAsJsonAsync(
            $"/api/transfers/{transfer.Id}",
            new { fromAccountId = euros, toAccountId = moreEuros, amount = "50.00", receivedAmount = "49.00", date = "2026-09-01" });
        var sameCurrency = await member.PutAsJsonAsync(
            $"/api/transfers/{transfer.Id}",
            new { fromAccountId = euros, toAccountId = moreEuros, amount = "50.00", receivedAmount = "50.00", date = "2026-09-01" });

        await AssertRejectedAsync(mismatch, "transfer.amountMismatch");
        sameCurrency.EnsureSuccessStatusCode();
        var updated = await sameCurrency.Content.ReadFromJsonAsync<TransferDto>();
        Assert.Equal(("50.00", "eur", "50.00", "eur"), (updated!.Amount, updated.Currency, updated.ReceivedAmount, updated.ReceivedCurrency));
        Assert.Equal("250.00", await CurrentBalanceAsync(euros, member));
        Assert.Equal("5.00", await CurrentBalanceAsync(dollars, member));
        Assert.Equal("50.00", await CurrentBalanceAsync(moreEuros, member));
    }

    [Theory]
    [InlineData("0.00", "amount")]
    [InlineData("1.005", "amount")]
    public async Task Amount_must_be_positive_money(string amount, string field)
    {
        var from = await CreateAccountAsync("100.00");
        var to = await CreateAccountAsync("0.00");
        var transfer = await CreateAsync(Client, from, to, "10.00");

        var response = await Client.PutAsJsonAsync(
            $"/api/transfers/{transfer.Id}",
            new { fromAccountId = from, toAccountId = to, amount, date = "2026-09-01" });

        await AssertValidationErrorAsync(response, field);
        Assert.Equal("90.00", await CurrentBalanceAsync(from));
    }

    [Fact]
    public async Task Both_accounts_must_differ_and_descriptions_are_limited()
    {
        var from = await CreateAccountAsync("100.00");
        var to = await CreateAccountAsync("0.00");
        var transfer = await CreateAsync(Client, from, to, "10.00");

        var sameAccount = await Client.PutAsJsonAsync(
            $"/api/transfers/{transfer.Id}",
            new { fromAccountId = from, toAccountId = from, amount = "10.00", date = "2026-09-01" });
        var longText = await Client.PutAsJsonAsync(
            $"/api/transfers/{transfer.Id}",
            new { fromAccountId = from, toAccountId = to, amount = "10.00", date = "2026-09-01", description = new string('x', 501) });

        await AssertValidationErrorAsync(sameAccount, "toAccountId");
        Assert.Contains("transfer.sameAccount", await sameAccount.Content.ReadAsStringAsync());
        await AssertValidationErrorAsync(longText, "description");
    }

    [Fact]
    public async Task Update_needs_access_to_the_old_and_the_new_accounts()
    {
        var partner = await CreateUserAsync();
        using var partnerClient = await LoginAsync(partner);
        using var stranger = await CreateUserClientAsync();
        var household = await CreateHouseholdAsync(partner);
        var shared = await CreateAccountAsync("100.00", householdId: household);
        var otherShared = await CreateAccountAsync("100.00", householdId: household);
        var adminsPersonal = await CreateAccountAsync("100.00");
        var partnersPersonal = await CreateAccountAsync("100.00", client: partnerClient);
        var mixed = await CreateAsync(Client, adminsPersonal, shared, "20.00");
        var visible = await CreateAsync(partnerClient, partnersPersonal, shared, "10.00");

        var oldAccountHidden = await partnerClient.PutAsJsonAsync(
            $"/api/transfers/{mixed.Id}",
            new { fromAccountId = partnersPersonal, toAccountId = shared, amount = "20.00", date = "2026-09-01" });
        var newAccountHidden = await partnerClient.PutAsJsonAsync(
            $"/api/transfers/{visible.Id}",
            new { fromAccountId = adminsPersonal, toAccountId = shared, amount = "10.00", date = "2026-09-01" });
        var byStranger = await stranger.PutAsJsonAsync(
            $"/api/transfers/{visible.Id}",
            new { fromAccountId = partnersPersonal, toAccountId = shared, amount = "10.00", date = "2026-09-01" });
        var betweenVisible = await partnerClient.PutAsJsonAsync(
            $"/api/transfers/{visible.Id}",
            new { fromAccountId = partnersPersonal, toAccountId = otherShared, amount = "15.00", date = "2026-09-01" });
        var byOwner = await Client.PutAsJsonAsync(
            $"/api/transfers/{mixed.Id}",
            new { fromAccountId = adminsPersonal, toAccountId = otherShared, amount = "25.00", date = "2026-09-01" });

        Assert.Equal(HttpStatusCode.Forbidden, oldAccountHidden.StatusCode);
        Assert.Contains("access.forbidden", await oldAccountHidden.Content.ReadAsStringAsync());
        await AssertRejectedAsync(newAccountHidden, "reference.notFound");
        Assert.Equal(HttpStatusCode.NotFound, byStranger.StatusCode);
        Assert.Equal(HttpStatusCode.OK, betweenVisible.StatusCode);
        Assert.Equal(HttpStatusCode.OK, byOwner.StatusCode);
        Assert.Equal("75.00", await CurrentBalanceAsync(adminsPersonal));
        Assert.Equal("100.00", await CurrentBalanceAsync(shared));
        Assert.Equal("140.00", await CurrentBalanceAsync(otherShared, partnerClient));
        Assert.Equal("85.00", await CurrentBalanceAsync(partnersPersonal, partnerClient));
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await Client.PutAsJsonAsync(
                $"/api/transfers/{Guid.NewGuid()}",
                new { fromAccountId = adminsPersonal, toAccountId = shared, amount = "1.00", date = "2026-09-01" })).StatusCode);
    }

    [Fact]
    public async Task A_bank_import_receipt_fixes_the_date_its_account_and_the_amount()
    {
        var source = await CreateAccountAsync("100.00");
        var destination = await CreateAccountAsync("100.00");
        var elsewhere = await CreateAccountAsync("0.00");
        await ConfirmImportAsync(source, new { importRef = "out-1", amount = "10.00", type = "expense", date = "2026-09-01", transferAccountId = destination });
        var transfer = (await Client.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?pageSize=200"))!.Items.Single(t => t.FromAccountId == source);
        Assert.Equal((true, false), (transfer.FromAccountImported, transfer.ToAccountImported));

        var newDate = await PutAsync(transfer.Id, source, destination, "10.00", "2026-09-02");
        var newAmount = await PutAsync(transfer.Id, source, destination, "11.00", "2026-09-01");
        var newSource = await PutAsync(transfer.Id, elsewhere, destination, "10.00", "2026-09-01");
        var reversed = await PutAsync(transfer.Id, destination, source, "10.00", "2026-09-01");
        var described = await PutAsync(transfer.Id, source, elsewhere, "10.00", "2026-09-01", "Rent share");

        foreach (var refused in new[] { newDate, newAmount, newSource, reversed })
        {
            await AssertRejectedAsync(refused, "value.locked");
        }

        described.EnsureSuccessStatusCode();
        var updated = await described.Content.ReadFromJsonAsync<TransferDto>();
        Assert.Equal(("Rent share", elsewhere), (updated!.Description, updated.ToAccountId));
        Assert.Equal((true, false), (updated.FromAccountImported, updated.ToAccountImported));
        Assert.Equal("90.00", await CurrentBalanceAsync(source));
        Assert.Equal("100.00", await CurrentBalanceAsync(destination));
        Assert.Equal("10.00", await CurrentBalanceAsync(elsewhere));

        await ConfirmImportAsync(
            elsewhere,
            new { importRef = "in-1", amount = "10.00", type = "income", date = "2026-09-01", transferAccountId = source, existingTransferId = transfer.Id });
        var bothMatched = await PutAsync(transfer.Id, source, destination, "10.00", "2026-09-01");
        await AssertRejectedAsync(bothMatched, "value.locked");
        var again = await Client.PostAsJsonAsync(
            "/api/import/swedbank/confirm",
            new { accountId = source, rows = new[] { new { importRef = "out-1", amount = "10.00", type = "expense", date = "2026-09-01" } } });
        Assert.Equal(1, (await again.Content.ReadFromJsonAsync<ConfirmDto>())!.SkippedDuplicates);
    }

    [Fact]
    public async Task A_broker_deposit_keeps_its_amount_and_brokerage_account_but_not_its_funding_account()
    {
        var brokerage = await CreateAccountAsync("0.00", "investment", "eur");
        var bank = await CreateAccountAsync("5000.00");
        var otherBank = await CreateAccountAsync("5000.00");
        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes(SampleFlexReport.Xml));
        file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/xml");
        form.Add(file, "file", "report.xml");
        form.Add(new StringContent(brokerage.ToString()), "accountId");
        form.Add(new StringContent(bank.ToString()), "fundingAccountId");
        (await Client.PostAsync("/api/investments/import/interactive-brokers", form)).EnsureSuccessStatusCode();
        var deposit = (await Client.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?pageSize=200"))!.Items.Single(t => t.ToAccountId == brokerage);
        Assert.Equal((false, true), (deposit.FromAccountImported, deposit.ToAccountImported));

        var newAmount = await PutAsync(deposit.Id, bank, brokerage, "2500.00", "2026-06-01");
        var newBrokerage = await PutAsync(deposit.Id, bank, otherBank, "2000.00", "2026-06-01");
        var newFunding = await PutAsync(deposit.Id, otherBank, brokerage, "2000.00", "2026-06-01", "Monthly deposit");

        await AssertRejectedAsync(newAmount, "value.locked");
        await AssertRejectedAsync(newBrokerage, "value.locked");
        newFunding.EnsureSuccessStatusCode();
        Assert.Equal("5000.00", await CurrentBalanceAsync(bank));
        Assert.Equal("3000.00", await CurrentBalanceAsync(otherBank));
    }

    [Fact]
    public async Task A_currency_that_was_switched_off_stays_editable_but_cannot_be_introduced()
    {
        var euros = await CreateAccountAsync("1000.00", currency: "eur");
        var pounds = await CreateAccountAsync("0.00", currency: "gbp");
        var moreEuros = await CreateAccountAsync("0.00", currency: "eur");
        var foreign = await CreateAsync(Client, euros, pounds, "100.00", receivedAmount: "80.00");
        var domestic = await CreateAsync(Client, euros, moreEuros, "10.00");
        var original = (await Client.GetFromJsonAsync<JsonObject>("/api/settings"))!;
        var restricted = original.DeepClone().AsObject();
        restricted["enabledCurrencies"] = new JsonArray("usd");

        try
        {
            (await Client.PutAsJsonAsync("/api/settings", restricted)).EnsureSuccessStatusCode();

            var kept = await Client.PutAsJsonAsync(
                $"/api/transfers/{foreign.Id}",
                new { fromAccountId = euros, toAccountId = pounds, amount = "110.00", receivedAmount = "88.00", date = "2026-09-01" });
            var introduced = await Client.PutAsJsonAsync(
                $"/api/transfers/{domestic.Id}",
                new { fromAccountId = euros, toAccountId = pounds, amount = "10.00", receivedAmount = "8.00", date = "2026-09-01" });

            kept.EnsureSuccessStatusCode();
            await AssertRejectedAsync(introduced, "currency.disabled");
        }
        finally
        {
            (await Client.PutAsJsonAsync("/api/settings", original)).EnsureSuccessStatusCode();
        }
    }

    private static Task<TransferDto> CreateAsync(HttpClient client, Guid from, Guid to, string amount, string? receivedAmount = null) =>
        PostAsync<TransferDto>(
            client,
            "/api/transfers",
            new { fromAccountId = from, toAccountId = to, amount, receivedAmount, date = "2026-09-01" });

    private Task<HttpResponseMessage> PutAsync(Guid id, Guid from, Guid to, string amount, string date, string? description = null) =>
        Client.PutAsJsonAsync($"/api/transfers/{id}", new { fromAccountId = from, toAccountId = to, amount, date, description });

    private Task<ConfirmDto> ConfirmImportAsync(Guid accountId, object row) =>
        PostAsync<ConfirmDto>(Client, "/api/import/swedbank/confirm", new { accountId, rows = new[] { row } });

    private sealed record ConfirmDto(int Imported, int SkippedDuplicates);
}
