using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<LedgerCollection>]
public sealed class BulkDeleteAndMoveTests(LedgerFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Date = "2026-06-05";

    [Fact]
    public async Task A_selection_is_deleted_with_one_trash_entry_per_row_and_comes_back_in_one_call()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: member);
        var first = await CreateTransactionAsync(member, account, null, "expense", "10.00", Date, "Maxima");
        var second = await CreateTransactionAsync(member, account, null, "expense", "5.50", Date, "Lidl");
        var split = await RecordTransactionAsync(member, new
        {
            accountId = account,
            type = "expense",
            amount = "20.00",
            date = Date,
            description = "Market",
            lines = new object[]
            {
                new { categoryId = await CreateCategoryAsync(client: member), amount = "12.00" },
                new { categoryId = await CreateCategoryAsync(client: member), amount = "8.00" },
            },
        });
        Guid[] ids = [first.Id, second.Id, split.Id, first.Id];

        var deleted = await ReadOkAsync<DeletedDto>(await BulkDeleteAsync(member, ids));
        var trash = await member.GetFromJsonAsync<PageDto<TrashRow>>("/api/trash", TestContext.Current.CancellationToken);
        var balanceAfterDelete = await CurrentBalanceAsync(account, member);
        var restored = await ReadOkAsync<RestoreDto>(await RestoreAsync(member, ids));
        var again = await ReadOkAsync<RestoreDto>(await RestoreAsync(member, ids));

        Assert.Equal(3, deleted.Deleted);
        Assert.Equal(3, trash!.Total);
        Assert.Contains(trash.Items, row => row.EntityId == second.Id && row.Description == "Lidl, 5.50 EUR");
        Assert.Equal("100.00", balanceAfterDelete);
        Assert.Equal((3, 0), (restored.Restored, restored.Refused.Count));
        Assert.Equal((3, 0), (again.Restored, again.Refused.Count));
        Assert.Equal("64.50", await CurrentBalanceAsync(account, member));
        Assert.Equal(2, (await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{split.Id}", TestContext.Current.CancellationToken))!.Lines!.Count);
        Assert.Empty((await member.GetFromJsonAsync<PageDto<TrashRow>>("/api/trash", TestContext.Current.CancellationToken))!.Items);
    }

    [Fact]
    public async Task A_row_deleted_with_a_selection_is_restorable_on_its_own()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var first = await CreateTransactionAsync(member, account, null, "expense", "3.00", Date);
        var second = await CreateTransactionAsync(member, account, null, "expense", "4.00", Date);
        (await BulkDeleteAsync(member, first.Id, second.Id)).EnsureSuccessStatusCode();

        var single = await member.PostAsJsonAsync(
            "/api/trash/restore",
            new { kind = "transaction", entityId = first.Id },
            TestContext.Current.CancellationToken);
        var trash = await member.GetFromJsonAsync<PageDto<TrashRow>>("/api/trash", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, single.StatusCode);
        Assert.Equal(second.Id, Assert.Single(trash!.Items).EntityId);
    }

    [Fact]
    public async Task An_invisible_row_refuses_the_whole_delete()
    {
        using var member = await CreateUserClientAsync();
        using var stranger = await CreateUserClientAsync();
        var mine = await CreateTransactionAsync(member, await CreateAccountAsync(client: member), null, "expense", "1.00", Date);
        var theirs = await CreateTransactionAsync(stranger, await CreateAccountAsync(client: stranger), null, "expense", "1.00", Date);

        var response = await BulkDeleteAsync(member, mine.Id, theirs.Id);

        await AssertProblemAsync(response, HttpStatusCode.NotFound, "resource.notFound");
        (await member.GetAsync($"/api/transactions/{mine.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Undoing_a_selection_restores_what_it_can_and_says_why_the_rest_stays()
    {
        using var member = await CreateUserClientAsync();
        var kept = await CreateAccountAsync(client: member);
        var archived = await CreateAccountAsync(client: member);
        var onKept = await CreateTransactionAsync(member, kept, null, "expense", "2.00", Date);
        var onArchived = await CreateTransactionAsync(member, archived, null, "expense", "3.00", Date);
        var neverDeleted = await CreateTransactionAsync(member, kept, null, "expense", "4.00", Date);
        (await BulkDeleteAsync(member, onKept.Id, onArchived.Id)).EnsureSuccessStatusCode();
        (await member.DeleteAsync($"/api/accounts/{archived}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var result = await ReadOkAsync<RestoreDto>(await RestoreAsync(member, onKept.Id, onArchived.Id, neverDeleted.Id));
        var trash = await member.GetFromJsonAsync<PageDto<TrashRow>>("/api/trash", TestContext.Current.CancellationToken);

        Assert.Equal(1, result.Restored);
        Assert.Equal(
            [(neverDeleted.Id, "resource.notFound"), (onArchived.Id, "restore.referenceMissing")],
            result.Refused.Select(r => (r.TransactionId, r.Code)).OrderBy(r => r.Code, StringComparer.Ordinal));
        Assert.Equal(onArchived.Id, Assert.Single(trash!.Items).EntityId);
        (await member.GetAsync($"/api/transactions/{onKept.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Moving_puts_rows_on_the_account_and_keeps_everything_else()
    {
        using var member = await CreateUserClientAsync();
        var from = await CreateAccountAsync("100.00", client: member);
        var to = await CreateAccountAsync("50.00", client: member);
        var category = await CreateCategoryAsync(client: member);
        var tag = await CreateTagAsync(client: member);
        var dollars = await RecordTransactionAsync(member, new
        {
            accountId = from,
            categoryId = category,
            type = "expense",
            amount = "10.00",
            currency = "usd",
            date = Date,
            description = "Dollars",
            tagIds = new[] { tag },
        });
        var plain = await CreateTransactionAsync(member, from, category, "expense", "20.00", Date, "Plain");
        var already = await CreateTransactionAsync(member, to, null, "expense", "1.00", Date, "Already there");

        var result = await ReadOkAsync<MoveDto>(await MoveAsync(member, to, dollars.Id, plain.Id, already.Id));
        var moved = await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{dollars.Id}", TestContext.Current.CancellationToken);

        Assert.Equal((2, 0), (result.Moved, result.Refused.Count));
        Assert.Equal(to, moved!.AccountId);
        Assert.Equal((category, "10.00", "usd", dollars.ReportingAmount), (moved.CategoryId, moved.Amount, moved.Currency, moved.ReportingAmount));
        Assert.Equal([tag], moved.TagIds);
        Assert.Equal("100.00", await CurrentBalanceAsync(from, member));
        Assert.Equal(to, (await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{plain.Id}", TestContext.Current.CancellationToken))!.AccountId);
    }

    [Fact]
    public async Task Moving_to_an_invisible_account_or_with_an_invisible_row_changes_nothing()
    {
        using var member = await CreateUserClientAsync();
        using var stranger = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var other = await CreateAccountAsync(client: member);
        var row = await CreateTransactionAsync(member, account, null, "expense", "1.00", Date);
        var foreignAccount = await CreateAccountAsync(client: stranger);
        var foreignRow = await CreateTransactionAsync(stranger, foreignAccount, null, "expense", "1.00", Date);

        await AssertProblemAsync(await MoveAsync(member, foreignAccount, row.Id), HttpStatusCode.BadRequest, "reference.notFound");
        await AssertProblemAsync(await MoveAsync(member, other, row.Id, foreignRow.Id), HttpStatusCode.NotFound, "resource.notFound");
        await AssertValidationErrorAsync(await MoveAsync(member, other, [.. Enumerable.Range(0, 201).Select(_ => Guid.NewGuid())]), "transactionIds");

        Assert.Equal(account, (await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{row.Id}", TestContext.Current.CancellationToken))!.AccountId);
    }

    [Fact]
    public async Task A_conversion_fee_stays_on_the_conversion_account()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: member);
        var other = await CreateAccountAsync(client: member);
        var conversion = await PostAsync<ConversionRow>(
            member,
            "/api/conversions",
            new
            {
                accountId = account,
                fromAmount = "10.00",
                fromCurrency = "eur",
                toAmount = "11.00",
                toCurrency = "usd",
                date = Date,
                feeAmount = "0.50",
                feeCurrency = "eur",
                feeCategoryId = await CreateCategoryAsync(client: member),
            });
        var plain = await CreateTransactionAsync(member, account, null, "expense", "2.00", Date);

        var result = await ReadOkAsync<MoveDto>(await MoveAsync(member, other, conversion.FeeTransactionId!.Value, plain.Id));

        Assert.Equal(1, result.Moved);
        var refusal = Assert.Single(result.Refused);
        Assert.Equal((conversion.FeeTransactionId.Value, "transaction.conversionFee"), (refusal.TransactionId, refusal.Code));
        Assert.Equal(account, (await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{refusal.TransactionId}", TestContext.Current.CancellationToken))!.AccountId);
    }

    [Fact]
    public async Task A_household_split_and_a_shared_debt_payment_keep_their_rules()
    {
        using var pair = await CreateHouseholdPairAsync();
        var mine = await CreateAccountAsync("100.00", client: pair.OwnerClient);
        var shared = await CreateAccountAsync("100.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var partners = await CreateAccountAsync("100.00", householdId: pair.HouseholdId, client: pair.PartnerClient);
        var split = await CreateTransactionAsync(pair.OwnerClient, mine, null, "expense", "30.00", Date, "Dinner");
        (await pair.OwnerClient.PostAsJsonAsync(
            $"/api/households/{pair.HouseholdId}/shared-expenses",
            new { transactionId = split.Id, method = "equal", shares = new[] { new { userId = pair.Owner.Id }, new { userId = pair.Partner.Id } } },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var debt = await PostAsync<IdDto>(pair.OwnerClient, "/api/debts", new
        {
            name = "Car loan",
            type = "loan",
            outstandingAmount = "1000.00",
            asOf = "2026-05-01",
            tracksPayments = true,
            scope = "shared",
            householdId = pair.HouseholdId,
        });
        var payment = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "50.00", Date, "Loan");
        (await pair.OwnerClient.PostAsJsonAsync($"/api/debts/{debt.Id}/payments", new { transactionId = payment.Id }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

        var toPartner = await ReadOkAsync<MoveDto>(await MoveAsync(pair.OwnerClient, partners, split.Id, payment.Id));
        var toMine = await ReadOkAsync<MoveDto>(await MoveAsync(pair.OwnerClient, mine, payment.Id));

        Assert.Equal(1, toPartner.Moved);
        Assert.Equal((split.Id, "settleUp.notPayer"), (Assert.Single(toPartner.Refused).TransactionId, toPartner.Refused[0].Code));
        Assert.Equal(0, toMine.Moved);
        Assert.Equal((payment.Id, "household.referenceNotShared"), (Assert.Single(toMine.Refused).TransactionId, toMine.Refused[0].Code));
    }

    [Fact]
    public async Task A_bulk_delete_a_move_and_an_undo_on_shared_rows_are_one_activity_row_each()
    {
        var household = await CreateHouseholdAsync();
        var account = await CreateAccountAsync("100.00", householdId: household);
        var other = await CreateAccountAsync("100.00", householdId: household);
        var rows = new List<Guid>();
        for (var i = 0; i < 3; i++)
        {
            rows.Add((await CreateTransactionAsync(Client, account, null, "expense", "1.00", Date, $"Row {i}")).Id);
        }

        (await MoveAsync(Client, other, [.. rows])).EnsureSuccessStatusCode();
        (await BulkDeleteAsync(Client, [.. rows])).EnsureSuccessStatusCode();
        (await RestoreAsync(Client, [.. rows])).EnsureSuccessStatusCode();

        var events = (await ReadOkAsync<PageDto<AuditRow>>(
                await Client.GetAsync($"/api/households/{household}/audit?pageSize=50", TestContext.Current.CancellationToken)))
            .Items.Where(e => e.EntityKind == "transaction" && e.Count == 3)
            .Select(e => (e.Action, e.Description))
            .Order()
            .ToList();
        var otherName = (await Client.GetFromJsonAsync<NamedRow>($"/api/accounts/{other}", TestContext.Current.CancellationToken))!.Name;

        Assert.Equal(
            [
                ("deleted", "Selection deleted, 3 transactions"),
                ("restored", "Selection restored, 3 transactions"),
                ("updated", $"Moved to {otherName}, 3 transactions"),
            ],
            events);
    }

    private static Task<HttpResponseMessage> BulkDeleteAsync(HttpClient client, params Guid[] transactionIds) =>
        client.PostAsJsonAsync("/api/transactions/bulk-delete", new { transactionIds }, TestContext.Current.CancellationToken);

    private static Task<HttpResponseMessage> RestoreAsync(HttpClient client, params Guid[] transactionIds) =>
        client.PostAsJsonAsync("/api/trash/restore-transactions", new { transactionIds }, TestContext.Current.CancellationToken);

    private static Task<HttpResponseMessage> MoveAsync(HttpClient client, Guid accountId, params Guid[] transactionIds) =>
        client.PostAsJsonAsync("/api/transactions/bulk-account", new { transactionIds, accountId }, TestContext.Current.CancellationToken);

    private sealed record DeletedDto(int Deleted);

    private sealed record RefusalDto(Guid TransactionId, string Code, string Reason);

    private sealed record RestoreDto(int Restored, List<RefusalDto> Refused);

    private sealed record MoveDto(int Moved, List<RefusalDto> Refused);

    private sealed record ConversionRow(Guid Id, Guid AccountId, Guid? FeeTransactionId);

    private sealed record AuditRow(string Action, string EntityKind, string Description, int? Count);
}
