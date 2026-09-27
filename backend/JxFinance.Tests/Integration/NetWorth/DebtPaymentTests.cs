using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.NetWorth;

[Collection<IntegrationCollection>]
public sealed class DebtPaymentTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Regular_and_extra_payments_lower_the_balance_and_a_typed_principal_wins()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var debt = await TrackedDebtAsync(member, "10000.00", "2026-05-01", 6m);
        var regular = await CreateTransactionAsync(member, account, null, "expense", "500.00", "2026-05-10", "Mortgage");
        var extra = await CreateTransactionAsync(member, account, null, "expense", "1000.00", "2026-05-12", "Overpayment");

        Assert.Equal("9550.00", (await LinkAsync(member, debt, regular.Id)).TrackedBalance);
        Assert.Equal("8550.00", (await LinkAsync(member, debt, extra.Id)).TrackedBalance);
        var payments = await PaymentsAsync(member, debt);
        Assert.Equal(
            [new PaymentDto(payments[0].Id, regular.Id, "500.00", "regular", "50.00", "450.00", false, "9550.00"), new PaymentDto(payments[1].Id, extra.Id, "1000.00", "extra", "0.00", "1000.00", false, "8550.00")],
            payments);

        var typed = await ReadOkAsync<DebtDto>(await member.PutAsJsonAsync(
            $"/api/debts/{debt}/payments/{payments[1].Id}",
            new { kind = "regular", principal = "900.00" },
            TestContext.Current.CancellationToken));

        Assert.Equal("8650.00", typed.TrackedBalance);
        Assert.Equal(new PaymentDto(payments[1].Id, extra.Id, "1000.00", "regular", "100.00", "900.00", true, "8650.00"), (await PaymentsAsync(member, debt))[1]);
        Assert.Equal("8650.00", (await member.GetFromJsonAsync<NetWorthDto>("/api/networth", TestContext.Current.CancellationToken))!.Debts);

        var anchored = await ReadOkAsync<DebtDto>(await member.PutAsJsonAsync($"/api/debts/{debt}", DebtBody("9000.00", "2026-05-31", 6m), TestContext.Current.CancellationToken));
        Assert.Equal("9000.00", anchored.TrackedBalance);
        Assert.Empty(await PaymentsAsync(member, debt));
    }

    [Fact]
    public async Task Deleting_and_restoring_the_transaction_moves_the_balance_without_touching_the_link()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var debt = await TrackedDebtAsync(member, "1000.00", "2026-05-01");
        var payment = await CreateTransactionAsync(member, account, null, "expense", "100.00", "2026-05-10");
        await LinkAsync(member, debt, payment.Id);

        (await member.DeleteAsync($"/api/transactions/{payment.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var deleted = await DebtAsync(member, debt);
        Assert.Equal(("1000.00", 1), (deleted.TrackedBalance, deleted.UnavailablePayments));

        (await member.PostAsJsonAsync("/api/trash/restore", new { kind = "transaction", entityId = payment.Id }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var restored = await DebtAsync(member, debt);
        Assert.Equal(("900.00", 0), (restored.TrackedBalance, restored.UnavailablePayments));
        var transactionId = new TransactionId(payment.Id);
        Assert.Equal(1, await WithDbAsync(db => db.DebtPayments.IgnoreQueryFilters().CountAsync(p => p.TransactionId == transactionId, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task A_housemate_edit_moves_the_balance_but_the_housemate_sees_no_link()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var debt = await TrackedDebtAsync(pair.OwnerClient, "1000.00", "2026-05-01");
        var payment = await CreateTransactionAsync(pair.PartnerClient, account, null, "expense", "100.00", "2026-05-10", "Loan");
        await LinkAsync(pair.OwnerClient, debt, payment.Id);

        (await pair.PartnerClient.PutAsJsonAsync(
            $"/api/transactions/{payment.Id}",
            new { id = payment.Id, accountId = account, type = "expense", amount = "150.00", date = "2026-05-10", description = "Loan" },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal("850.00", (await DebtAsync(pair.OwnerClient, debt)).TrackedBalance);
        var marker = (await LedgerRowAsync(pair.OwnerClient, payment.Id)).DebtPayment!;
        Assert.Equal((debt, "Mortgage"), (marker.DebtId, marker.DebtName));
        Assert.Null((await LedgerRowAsync(pair.PartnerClient, payment.Id)).DebtPayment);
        var partnerDebt = await TrackedDebtAsync(pair.PartnerClient, "500.00", "2026-05-01");
        await AssertProblemAsync(await LinkResponseAsync(pair.PartnerClient, partnerDebt, payment.Id), HttpStatusCode.Conflict, "debt.paymentTaken");
    }

    [Fact]
    public async Task Taken_income_split_unknown_and_untracked_links_are_refused()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var category = await CreateCategoryAsync(client: member);
        var debt = await TrackedDebtAsync(member, "1000.00", "2026-05-01");
        var second = await TrackedDebtAsync(member, "1000.00", "2026-05-01");
        var untracked = (await PostAsync<IdDto>(member, "/api/debts", DebtBody("1000.00", "2026-05-01", null, tracksPayments: false))).Id;
        var payment = await CreateTransactionAsync(member, account, null, "expense", "100.00", "2026-05-10");
        var income = await CreateTransactionAsync(member, account, null, "income", "100.00", "2026-05-10");
        var split = await RecordTransactionAsync(member, new
        {
            accountId = account,
            type = "expense",
            amount = "100.00",
            date = "2026-05-10",
            lines = new[] { new { categoryId = category, amount = "60.00" }, new { categoryId = category, amount = "40.00" } },
        });
        await LinkAsync(member, debt, payment.Id);

        await AssertProblemAsync(await LinkResponseAsync(member, second, payment.Id), HttpStatusCode.Conflict, "debt.paymentTaken");
        await AssertProblemAsync(await LinkResponseAsync(member, second, income.Id), HttpStatusCode.BadRequest, "debt.paymentWrongType");
        await AssertProblemAsync(await LinkResponseAsync(member, second, split.Id), HttpStatusCode.BadRequest, "transaction.splitNotAllowed");
        await AssertProblemAsync(await LinkResponseAsync(member, second, Guid.NewGuid()), HttpStatusCode.BadRequest, "reference.notFound");
        await AssertProblemAsync(await LinkResponseAsync(member, untracked, income.Id), HttpStatusCode.BadRequest, "debt.notTracked");
    }

    [Fact]
    public async Task A_foreign_payment_is_converted_and_one_without_a_rate_leaves_the_balance_incomplete_with_no_snapshot()
    {
        using var member = await CreateUserClientAsync();
        var dollars = await CreateAccountAsync(currency: "usd", client: member);
        var euros = await CreateAccountAsync(client: member);
        var converted = await TrackedDebtAsync(member, "1000.00", "2026-05-01");
        var payment = await CreateTransactionAsync(member, dollars, null, "expense", "110.00", "2026-05-10");
        Assert.Equal("900.00", (await LinkAsync(member, converted, payment.Id)).TrackedBalance);

        Guid dollarDebt;
        await using (await OverrideSettingsAsync(settings => settings["reportingCurrency"] = "usd"))
        {
            dollarDebt = await TrackedDebtAsync(member, "1000.00", "1995-01-01");
        }

        var unrated = await CreateTransactionAsync(member, euros, null, "expense", "100.00", "1995-01-10");
        var incomplete = await LinkAsync(member, dollarDebt, unrated.Id);

        Assert.Equal(("1000.00", true), (incomplete.TrackedBalance, incomplete.TrackedIncomplete));
        Assert.False((await member.GetFromJsonAsync<NetWorthDto>("/api/networth", TestContext.Current.CancellationToken))!.IsComplete);
        Assert.Empty((await member.GetFromJsonAsync<HistoryDto>("/api/networth/history", TestContext.Current.CancellationToken))!.Items);
    }

    [Fact]
    public async Task Confirming_a_recurring_entry_with_a_debt_links_a_regular_payment_and_the_job_matches_the_endpoint()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        var debt = await TrackedDebtAsync(member, "1000.00", "2026-05-01");
        await AssertProblemAsync(
            await member.PostAsJsonAsync("/api/recurring-bills", BillBody("income", account, debt), TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "recurringBill.debtShape");
        await AssertProblemAsync(
            await member.PostAsJsonAsync("/api/recurring-bills", BillBody("expense", account, Guid.NewGuid()), TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "reference.notFound");
        var bill = await PostAsync<BillDto>(member, "/api/recurring-bills", BillBody("expense", account, debt));
        Assert.Equal(debt, bill.DebtId);

        (await member.PostAsJsonAsync($"/api/recurring-bills/{bill.Id}/confirm", new { expectedDueDate = "2026-06-01" }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var payment = Assert.Single(await PaymentsAsync(member, debt));
        Assert.Equal(("200.00", "regular", "800.00"), (payment.Amount, payment.Kind, payment.Balance));
        await Job<NetWorthSnapshotJob>().RunOnceAsync(TestContext.Current.CancellationToken);
        var snapshot = Assert.Single((await member.GetFromJsonAsync<HistoryDto>("/api/networth/history", TestContext.Current.CancellationToken))!.Items);
        Assert.Equal("800.00", snapshot.Debts);
        Assert.Equal(snapshot.Debts, (await member.GetFromJsonAsync<NetWorthDto>("/api/networth", TestContext.Current.CancellationToken))!.Debts);
    }

    [Fact]
    public async Task Purging_a_debt_or_a_transaction_removes_its_links_and_frees_the_recurring_entry()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var debt = await TrackedDebtAsync(member, "1000.00", "2026-05-01");
        var kept = await TrackedDebtAsync(member, "1000.00", "2026-05-01");
        var first = await CreateTransactionAsync(member, account, null, "expense", "100.00", "2026-05-10");
        var second = await CreateTransactionAsync(member, account, null, "expense", "100.00", "2026-05-11");
        await LinkAsync(member, debt, first.Id);
        await LinkAsync(member, kept, second.Id);
        var bill = await PostAsync<BillDto>(member, "/api/recurring-bills", BillBody("expense", account, debt));
        (await member.DeleteAsync($"/api/recurring-bills/{bill.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await member.DeleteAsync($"/api/debts/{debt}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await member.PostAsJsonAsync("/api/trash/restore", new { kind = "recurringBill", entityId = bill.Id }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Null((await member.GetFromJsonAsync<BillDto>($"/api/recurring-bills/{bill.Id}", TestContext.Current.CancellationToken))!.DebtId);
        await SqlAsync($"""UPDATE "RecurringBills" SET "DebtId" = {debt} WHERE "Id" = {bill.Id}""");
        (await member.DeleteAsync($"/api/transactions/{second.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var old = DateTimeOffset.UtcNow.AddDays(-DeletionEntry.RetentionDays - 1);
        var debtId = new DebtId(debt);
        var secondId = new TransactionId(second.Id);
        await WithDbAsync(async db =>
        {
            await db.Debts.IgnoreQueryFilters().Where(d => d.Id == debtId).ExecuteUpdateAsync(s => s.SetProperty(d => d.UpdatedAt, old), TestContext.Current.CancellationToken);
            await db.Transactions.IgnoreQueryFilters().Where(t => t.Id == secondId).ExecuteUpdateAsync(s => s.SetProperty(t => t.UpdatedAt, old), TestContext.Current.CancellationToken);
        });
        await Job<RetentionJob>().RunOnceAsync(TestContext.Current.CancellationToken);

        var billId = new RecurringBillId(bill.Id);
        var keptId = new DebtId(kept);
        Assert.Equal(0, await WithDbAsync(db => db.DebtPayments.IgnoreQueryFilters().CountAsync(p => p.DebtId == debtId || p.DebtId == keptId, TestContext.Current.CancellationToken)));
        Assert.Null(await WithDbAsync(db => db.RecurringBills.IgnoreQueryFilters().Where(b => b.Id == billId).Select(b => b.DebtId).SingleAsync(TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Another_user_gets_not_found_on_every_route()
    {
        using var owner = await CreateUserClientAsync();
        using var other = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: owner);
        var debt = await TrackedDebtAsync(owner, "1000.00", "2026-05-01");
        var payment = await CreateTransactionAsync(owner, account, null, "expense", "100.00", "2026-05-10");
        await LinkAsync(owner, debt, payment.Id);
        var link = Assert.Single(await PaymentsAsync(owner, debt)).Id;
        var url = $"/api/debts/{debt}/payments";

        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync(url, TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/debts/{debt}/payment-candidates", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await LinkResponseAsync(other, debt, payment.Id)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PutAsJsonAsync($"{url}/{link}", new { kind = "extra" }, TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync($"{url}/{link}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Single(await PaymentsAsync(owner, debt));

        Assert.Equal(HttpStatusCode.NoContent, (await owner.DeleteAsync($"{url}/{link}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await owner.DeleteAsync($"{url}/{link}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal("1000.00", (await DebtAsync(owner, debt)).TrackedBalance);
    }

    [Fact]
    public async Task Candidates_are_unlinked_plain_expenses_since_the_anchor_best_matches_first()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var debt = (await PostAsync<IdDto>(member, "/api/debts", new
        {
            name = "Car loan",
            type = "loan",
            outstandingAmount = "10000.00",
            interestRate = 0m,
            asOf = "2026-05-01",
            loanAmount = "12000.00",
            firstPaymentDate = "2026-01-15",
            termMonths = 24,
            tracksPayments = true,
        })).Id;
        await CreateTransactionAsync(member, account, null, "expense", "500.00", "2026-04-15", "Before the anchor");
        var linked = await CreateTransactionAsync(member, account, null, "expense", "500.00", "2026-05-15", "Leasing Co");
        await LinkAsync(member, debt, linked.Id);
        var plain = await CreateTransactionAsync(member, account, null, "expense", "20.00", "2026-06-20", "Groceries");
        var amount = await CreateTransactionAsync(member, account, null, "expense", "505.00", "2026-06-10", "Transfer");
        var named = await CreateTransactionAsync(member, account, null, "expense", "480.00", "2026-06-01", "leasing co");
        await CreateTransactionAsync(member, account, null, "income", "500.00", "2026-06-15", "Leasing Co");

        var candidates = await member.GetFromJsonAsync<List<IdDto>>($"/api/debts/{debt}/payment-candidates", TestContext.Current.CancellationToken);

        Assert.Equal([named.Id, amount.Id, plain.Id], candidates!.Select(c => c.Id));
    }

    private static async Task<Guid> TrackedDebtAsync(HttpClient client, string outstandingAmount, string asOf, decimal? interestRate = null) =>
        (await PostAsync<IdDto>(client, "/api/debts", DebtBody(outstandingAmount, asOf, interestRate))).Id;

    private static object DebtBody(string outstandingAmount, string asOf, decimal? interestRate, bool tracksPayments = true) =>
        new { name = "Mortgage", type = "mortgage", outstandingAmount, interestRate, asOf, tracksPayments };

    private static object BillBody(string shape, Guid account, Guid debtId) =>
        new { name = "Loan payment", shape, kind = "fixed", amount = "200.00", accountId = account, cadence = "monthly", nextDueDate = "2026-06-01", remindDaysBefore = 3, debtId };

    private static Task<HttpResponseMessage> LinkResponseAsync(HttpClient client, Guid debt, Guid transactionId) =>
        client.PostAsJsonAsync($"/api/debts/{debt}/payments", new { transactionId }, TestContext.Current.CancellationToken);

    private static async Task<DebtDto> LinkAsync(HttpClient client, Guid debt, Guid transactionId) =>
        await ReadOkAsync<DebtDto>(await LinkResponseAsync(client, debt, transactionId));

    private static async Task<DebtDto> DebtAsync(HttpClient client, Guid debt) =>
        (await client.GetFromJsonAsync<List<DebtDto>>("/api/debts", TestContext.Current.CancellationToken))!.Single(d => d.Id == debt);

    private static async Task<List<PaymentDto>> PaymentsAsync(HttpClient client, Guid debt) =>
        (await client.GetFromJsonAsync<List<PaymentDto>>($"/api/debts/{debt}/payments", TestContext.Current.CancellationToken))!;

    private static async Task<LedgerRowDto> LedgerRowAsync(HttpClient client, Guid transactionId) =>
        (await client.GetFromJsonAsync<PageDto<LedgerRowDto>>("/api/transactions?pageSize=100", TestContext.Current.CancellationToken))!.Items.Single(t => t.Id == transactionId);

    private sealed record DebtDto(Guid Id, string? TrackedBalance, bool TrackedIncomplete, int UnavailablePayments);

    private sealed record PaymentDto(Guid Id, Guid TransactionId, string Amount, string Kind, string Interest, string Principal, bool PrincipalTyped, string Balance);

    private sealed record MarkerDto(Guid Id, Guid DebtId, string DebtName);


    private sealed record LedgerRowDto(Guid Id, MarkerDto? DebtPayment);

    private sealed record BillDto(Guid Id, Guid? DebtId);

    private sealed record NetWorthDto(string Debts, bool IsComplete);

    private sealed record HistoryDto(List<NetWorthDto> Items);
}
