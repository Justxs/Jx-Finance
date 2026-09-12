using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transfers;

[Collection(IntegrationCollection.Name)]
public sealed class TransferEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Transfer_moves_balance_between_accounts_and_nets_to_zero_overall()
    {
        var from = await CreateAccountAsync("Transfer From", "150.00");
        var to = await CreateAccountAsync("Transfer To", "50.00");

        var createResponse = await Client.PostAsJsonAsync(
            "/api/transfers",
            new { fromAccountId = from.Id, toAccountId = to.Id, amount = "40.00", date = "2026-06-10" });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var transfer = await createResponse.Content.ReadFromJsonAsync<TransferDto>();

        var fromAfter = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{from.Id}");
        var toAfter = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{to.Id}");
        Assert.Equal("110.00", fromAfter!.CurrentBalance);
        Assert.Equal("90.00", toAfter!.CurrentBalance);

        var deleteResponse = await Client.DeleteAsync($"/api/transfers/{transfer!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var fromReverted = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{from.Id}");
        var toReverted = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{to.Id}");
        Assert.Equal("150.00", fromReverted!.CurrentBalance);
        Assert.Equal("50.00", toReverted!.CurrentBalance);
    }

    [Fact]
    public async Task Transfer_rejects_the_same_account_as_source_and_destination()
    {
        var account = await CreateAccountAsync("Same Account", "10.00");

        var response = await Client.PostAsJsonAsync(
            "/api/transfers",
            new { fromAccountId = account.Id, toAccountId = account.Id, amount = "5.00", date = "2026-06-10" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Transfers_are_listed_and_paged()
    {
        var from = await CreateAccountAsync("List From", "500.00");
        var to = await CreateAccountAsync("List To", "0.00");

        await Client.PostAsJsonAsync(
            "/api/transfers",
            new { fromAccountId = from.Id, toAccountId = to.Id, amount = "10.00", date = "2026-06-11" });

        var listResponse = await Client.GetFromJsonAsync<PagedTransferDto>("/api/transfers?page=1&pageSize=5");
        Assert.NotNull(listResponse);
        Assert.True(listResponse.Total >= 1);
    }

    private async Task<AccountDto> CreateAccountAsync(string name, string startingBalance)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name, type = "checking", startingBalance });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AccountDto>())!;
    }

    private sealed record AccountDto(Guid Id, string CurrentBalance);

    private sealed record TransferDto(Guid Id);

    private sealed record PagedTransferDto(List<TransferDto> Items, int Page, int PageSize, int Total);
}
