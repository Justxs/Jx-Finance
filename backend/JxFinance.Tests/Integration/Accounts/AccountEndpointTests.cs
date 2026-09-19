using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Accounts;

[Collection<IntegrationCollection>]
public sealed class AccountEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Create_get_update_and_archive_an_account()
    {
        var created = await CreateAccountAsync("Checking main", "checking", "1200.00");
        Assert.Equal("1200.00", created.StartingBalance);
        Assert.Equal("1200.00", created.CurrentBalance);
        Assert.Equal("checking", created.Type);

        var listed = await Client.GetFromJsonAsync<List<AccountDto>>("/api/accounts");
        Assert.Contains(listed!, a => a.Id == created.Id);

        var updateResponse = await Client.PutAsJsonAsync(
            $"/api/accounts/{created.Id}",
            new { name = "Renamed", type = "savings", startingBalance = "900.50" });
        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<AccountDto>();
        Assert.Equal("Renamed", updated!.Name);
        Assert.Equal("savings", updated.Type);
        Assert.Equal("900.50", updated.CurrentBalance);

        var deleteResponse = await Client.DeleteAsync($"/api/accounts/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await Client.GetAsync($"/api/accounts/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, afterDelete.StatusCode);

        var listAfterDelete = await Client.GetFromJsonAsync<List<AccountDto>>("/api/accounts");
        Assert.DoesNotContain(listAfterDelete!, a => a.Id == created.Id);
    }

    [Fact]
    public async Task Current_balance_reflects_income_and_expense_transactions()
    {
        var account = await CreateAccountAsync("Balance check", "cash", "100.00");

        await CreateTransactionAsync(account.Id, "income", "50.00");
        await CreateTransactionAsync(account.Id, "expense", "20.00");

        var fetched = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{account.Id}");
        Assert.Equal("130.00", fetched!.CurrentBalance);
        Assert.Equal("100.00", fetched.StartingBalance);
    }

    [Fact]
    public async Task Create_rejects_a_malformed_starting_balance()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = "Bad", type = "cash", startingBalance = "12.345" });
        await AssertValidationErrorAsync(response, "startingBalance");
    }

    [Fact]
    public async Task Create_stores_description_and_normalizes_the_iban()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new
            {
                name = "With details",
                description = "  Main salary account  ",
                iban = "lt12 1000 0111 0100 1000",
                type = "checking",
                startingBalance = "0.00",
            });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<AccountDto>();
        Assert.Equal("Main salary account", created!.Description);
        Assert.Equal("LT121000011101001000", created.Iban);
    }

    [Fact]
    public async Task Create_rejects_an_invalid_iban()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = "Bad iban", iban = "NOT-AN-IBAN", type = "cash", startingBalance = "0.00" });
        await AssertValidationErrorAsync(response, "iban");
    }

    private async Task<AccountDto> CreateAccountAsync(string name, string type, string startingBalance)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name, type, startingBalance });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<AccountDto>())!;
    }

    private async Task CreateTransactionAsync(Guid accountId, string type, string amount)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId, type, amount, date = "2026-06-01" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private sealed record AccountDto(
        Guid Id,
        string Name,
        string? Description,
        string? Iban,
        string Type,
        string StartingBalance,
        string CurrentBalance);
}
