using System.Net;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Households;

[Collection<IntegrationCollection>]
public sealed class UserIsolationTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Theory]
    [InlineData("budgets")]
    [InlineData("goals")]
    [InlineData("recurring-bills")]
    [InlineData("assets")]
    [InlineData("debts")]
    [InlineData("conversions")]
    [InlineData("transfers")]
    [InlineData("investments/transactions")]
    public async Task Another_users_personal_record_is_neither_listed_nor_deletable(string resource)
    {
        var id = await CreateAsAdminAsync(resource);
        using var stranger = await CreateUserClientAsync();

        var listed = await stranger.GetStringAsync($"/api/{resource}?pageSize=200", TestContext.Current.CancellationToken);
        var delete = await stranger.DeleteAsync($"/api/{resource}/{id}", TestContext.Current.CancellationToken);

        Assert.DoesNotContain(id.ToString(), listed);
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
        Assert.Contains(id.ToString(), await Client.GetStringAsync($"/api/{resource}?pageSize=200", TestContext.Current.CancellationToken));
    }

    private async Task<Guid> CreateAsAdminAsync(string resource)
    {
        object body = resource switch
        {
            "budgets" => new { categoryId = await CreateCategoryAsync(), limitAmount = "100.00" },
            "goals" => new { name = "Private goal", targetAmount = "500.00" },
            "recurring-bills" => new { name = "Private bill", kind = "fixed", amount = "5.00", cadence = "monthly", nextDueDate = "2026-09-01" },
            "assets" => new { name = "Private asset", type = "vehicle", currentValue = "100.00", asOf = Today },
            "debts" => new { name = "Private debt", type = "loan", outstandingAmount = "100.00", asOf = Today },
            "conversions" => new
            {
                accountId = await CreateAccountAsync("100.00"),
                fromAmount = "10.00",
                fromCurrency = "eur",
                toAmount = "11.00",
                toCurrency = "usd",
                date = "2026-06-05",
            },
            "transfers" => new
            {
                fromAccountId = await CreateAccountAsync("100.00"),
                toAccountId = await CreateAccountAsync(),
                amount = "10.00",
                date = "2026-06-05",
            },
            "investments/transactions" => new
            {
                accountId = await CreateAccountAsync("100.00", "investment"),
                type = "interest",
                date = "2026-06-05",
                amount = "10.00",
            },
            _ => throw new ArgumentOutOfRangeException(nameof(resource)),
        };

        return (await PostAsync<IdDto>(Client, $"/api/{resource}", body)).Id;
    }
}
