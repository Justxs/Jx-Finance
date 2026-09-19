using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transfers;

[Collection<IntegrationCollection>]
public sealed class TransferEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Transfer_moves_balance_between_accounts_and_nets_to_zero_overall()
    {
        var from = await CreateAccountAsync("150.00");
        var to = await CreateAccountAsync("50.00");

        var createResponse = await Client.PostAsJsonAsync(
            "/api/transfers",
            new { fromAccountId = from, toAccountId = to, amount = "40.00", date = "2026-06-10" });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var transfer = await createResponse.Content.ReadFromJsonAsync<TransferDto>();

        Assert.Equal("110.00", await CurrentBalanceAsync(from));
        Assert.Equal("90.00", await CurrentBalanceAsync(to));

        var deleteResponse = await Client.DeleteAsync($"/api/transfers/{transfer!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        Assert.Equal("150.00", await CurrentBalanceAsync(from));
        Assert.Equal("50.00", await CurrentBalanceAsync(to));
    }

    [Fact]
    public async Task Transfer_rejects_the_same_account_as_source_and_destination()
    {
        var account = await CreateAccountAsync("10.00");

        var response = await Client.PostAsJsonAsync(
            "/api/transfers",
            new { fromAccountId = account, toAccountId = account, amount = "5.00", date = "2026-06-10" });
        await AssertValidationErrorAsync(response, "toAccountId");
    }

    [Fact]
    public async Task Transfers_are_listed_and_paged()
    {
        var from = await CreateAccountAsync("500.00");
        var to = await CreateAccountAsync();
        var first = await PostAsync<TransferDto>(
            Client,
            "/api/transfers",
            new { fromAccountId = from, toAccountId = to, amount = "10.00", date = "2026-06-11" });
        var second = await PostAsync<TransferDto>(
            Client,
            "/api/transfers",
            new { fromAccountId = from, toAccountId = to, amount = "20.00", date = "2026-06-12" });

        var page = await Client.GetFromJsonAsync<PagedTransferDto>("/api/transfers?page=1&pageSize=1");
        var all = await Client.GetFromJsonAsync<PagedTransferDto>("/api/transfers?pageSize=200");

        Assert.Single(page!.Items);
        Assert.Equal(1, page.PageSize);
        Assert.True(page.Total >= 2);
        Assert.Contains(all!.Items, t => t.Id == first.Id);
        Assert.Contains(all.Items, t => t.Id == second.Id);
    }

    private sealed record TransferDto(Guid Id);

    private sealed record PagedTransferDto(List<TransferDto> Items, int Page, int PageSize, int Total);
}
