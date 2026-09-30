using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.RecurringBills;

[Collection<IntegrationCollection>]
public sealed class SpreadRecurringBillTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Confirming_a_spread_entry_writes_a_spread_transaction()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var due = new DateOnly(2026, 1, 15);
        var bill = await PostAsync<BillDto>(
            member,
            "/api/recurring-bills",
            new
            {
                name = "Car insurance",
                shape = "expense",
                kind = "fixed",
                amount = "360.00",
                accountId = account,
                cadence = "yearly",
                nextDueDate = due,
                remindDaysBefore = 0,
                spreadMonths = 12,
            });

        var confirmed = await PostAsync<ConfirmedDto>(member, $"/api/recurring-bills/{bill.Id}/confirm", new { expectedDueDate = due });
        var row = (await member.GetFromJsonAsync<RowDto>($"/api/transactions/{confirmed.TransactionId}", TestContext.Current.CancellationToken))!;

        Assert.Equal(12, bill.SpreadMonths);
        Assert.Equal((12, new DateOnly(2026, 12, 15)), (row.SpreadMonths, row.SpreadUntil));
    }

    [Fact]
    public async Task A_transfer_entry_cannot_be_spread()
    {
        using var member = await CreateUserClientAsync();
        var from = await CreateAccountAsync("1000.00", client: member);
        var to = await CreateAccountAsync("0.00", client: member);

        var response = await member.PostAsJsonAsync(
            "/api/recurring-bills",
            new
            {
                name = "Savings",
                shape = "transfer",
                kind = "fixed",
                amount = "100.00",
                accountId = from,
                toAccountId = to,
                cadence = "monthly",
                nextDueDate = "2026-10-01",
                remindDaysBefore = 0,
                spreadMonths = 3,
            },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "value.mustBeEmpty");
    }

    private sealed record BillDto(Guid Id, int? SpreadMonths);

    private sealed record ConfirmedDto(Guid? TransactionId);

    private sealed record RowDto(Guid Id, int? SpreadMonths, DateOnly? SpreadUntil);
}
