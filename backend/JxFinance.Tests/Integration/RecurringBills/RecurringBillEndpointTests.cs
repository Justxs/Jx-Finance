using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.RecurringBills;

[Collection(IntegrationCollection.Name)]
public sealed class RecurringBillEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Create_a_fixed_bill_requires_an_amount()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/recurring-bills",
            new
            {
                name = $"Rent {Guid.NewGuid():N}",
                kind = "fixed",
                cadence = "monthly",
                nextDueDate = "2026-08-01",
                remindDaysBefore = 3,
            });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_a_variable_bill_rejects_an_upfront_amount()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/recurring-bills",
            new
            {
                name = $"Electricity {Guid.NewGuid():N}",
                kind = "variable",
                amount = "40.00",
                cadence = "monthly",
                nextDueDate = "2026-08-01",
                remindDaysBefore = 3,
            });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_get_update_and_delete_a_fixed_bill()
    {
        var created = await CreateFixedBillAsync("Internet", "20.00", "2026-08-01");
        Assert.Equal("20.00", created.Amount);
        Assert.Equal("monthly", created.Cadence);
        Assert.True(created.IsActive);

        var fetched = await Client.GetFromJsonAsync<RecurringBillDto>($"/api/recurring-bills/{created.Id}");
        Assert.Equal(created.Id, fetched!.Id);

        var listed = await Client.GetFromJsonAsync<List<RecurringBillDto>>("/api/recurring-bills");
        Assert.Contains(listed!, b => b.Id == created.Id);

        var updateResponse = await Client.PutAsJsonAsync(
            $"/api/recurring-bills/{created.Id}",
            new
            {
                id = created.Id,
                name = "Internet & TV",
                kind = "fixed",
                amount = "25.00",
                cadence = "monthly",
                nextDueDate = "2026-08-01",
                remindDaysBefore = 5,
                isActive = false,
            });
        updateResponse.EnsureSuccessStatusCode();
        var updated = await updateResponse.Content.ReadFromJsonAsync<RecurringBillDto>();
        Assert.Equal("Internet & TV", updated!.Name);
        Assert.Equal("25.00", updated.Amount);
        Assert.False(updated.IsActive);

        var deleteResponse = await Client.DeleteAsync($"/api/recurring-bills/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterDelete = await Client.GetAsync($"/api/recurring-bills/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, afterDelete.StatusCode);
    }

    [Fact]
    public async Task Confirming_a_fixed_bill_creates_a_transaction_and_advances_the_due_date()
    {
        var accountResponse = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = $"Bills account {Guid.NewGuid():N}", type = "checking", startingBalance = "500.00" });
        var account = await accountResponse.Content.ReadFromJsonAsync<AccountDto>();

        var created = await CreateFixedBillAsync("Gym", "30.00", "2026-08-01", account!.Id);

        var confirmResponse = await Client.PostAsJsonAsync(
            $"/api/recurring-bills/{created.Id}/confirm",
            new { expectedDueDate = created.NextDueDate });
        confirmResponse.EnsureSuccessStatusCode();
        var confirmed = await confirmResponse.Content.ReadFromJsonAsync<ConfirmDto>();
        Assert.NotEqual(Guid.Empty, confirmed!.TransactionId);
        Assert.Equal("2026-09-01", confirmed.Bill.NextDueDate.ToString("yyyy-MM-dd"));

        var transaction = await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{confirmed.TransactionId}");
        Assert.Equal("30.00", transaction!.Amount);
        Assert.Equal("expense", transaction.Type);
    }

    [Fact]
    public async Task Confirming_a_variable_bill_without_an_amount_fails()
    {
        var created = await CreateVariableBillAsync("Groceries", "2026-08-01");

        var response = await Client.PostAsJsonAsync($"/api/recurring-bills/{created.Id}/confirm", new { expectedDueDate = created.NextDueDate });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<RecurringBillDto> CreateFixedBillAsync(
        string name,
        string amount,
        string nextDueDate,
        Guid? accountId = null)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/recurring-bills",
            new
            {
                name = $"{name} {Guid.NewGuid():N}",
                kind = "fixed",
                amount,
                accountId,
                cadence = "monthly",
                nextDueDate,
                remindDaysBefore = 3,
            });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<RecurringBillDto>())!;
    }

    private async Task<RecurringBillDto> CreateVariableBillAsync(string name, string nextDueDate)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/recurring-bills",
            new
            {
                name = $"{name} {Guid.NewGuid():N}",
                kind = "variable",
                cadence = "monthly",
                nextDueDate,
                remindDaysBefore = 3,
            });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<RecurringBillDto>())!;
    }

    private sealed record AccountDto(Guid Id);

    private sealed record TransactionDto(Guid Id, string Amount, string Type);

    private sealed record RecurringBillDto(
        Guid Id,
        string Name,
        string Kind,
        string? Amount,
        Guid? CategoryId,
        Guid? AccountId,
        string Cadence,
        DateOnly NextDueDate,
        int RemindDaysBefore,
        bool IsActive);

    private sealed record ConfirmDto(RecurringBillDto Bill, Guid TransactionId);
}
