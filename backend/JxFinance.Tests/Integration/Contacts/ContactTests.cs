using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Contacts;

[Collection<IntegrationCollection>]
public sealed class ContactTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_shared_dinner_a_loan_and_a_repayment_add_up_per_person_and_currency()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: client);
        var jonas = await ContactAsync(client, "Jonas");
        var ona = await ContactAsync(client, "Ona");
        var dinner = await ExpenseAsync(client, account, "90.00", "Dinner");

        var split = await SplitAsync(client, new { transactionId = dinner, method = "equal", own = new { }, shares = new[] { Share(jonas), Share(ona) } });
        await PaymentAsync(client, jonas, "toContact", "50.00");
        await PaymentAsync(client, jonas, "fromContact", "20.00", "usd");
        await PaymentAsync(client, ona, "fromContact", "30.00");

        Assert.Equal("30.00", split.OwnAmount);
        Assert.Equal(["30.00", "30.00"], split.Shares.Select(s => s.Amount));
        var people = await PeopleAsync(client);
        Assert.Equal(["Jonas", "Ona"], people.Select(p => p.Name));
        Assert.Equal([("eur", "80.00"), ("usd", "-20.00")], people[0].Balances.Select(b => (b.Currency, b.Amount)));
        Assert.Empty(people[1].Balances);
        var history = await EntriesAsync(client, jonas);
        Assert.Equal(3, history.Total);
        Assert.Contains(history.Items, e => e is { Kind: "split", Amount: "30.00", Description: "Dinner", Counted: true });
        Assert.Contains(history.Items, e => e is { Kind: "payment", Direction: "toContact", Amount: "50.00" });
    }

    [Fact]
    public async Task People_are_personal()
    {
        using var pair = await CreateHouseholdPairAsync();
        var jonas = await ContactAsync(pair.OwnerClient, "Jonas");
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.PartnerClient);
        var partnersRow = await ExpenseAsync(pair.PartnerClient, shared, "20.00", "Taxi");

        Assert.Empty(await PeopleAsync(pair.PartnerClient));
        Assert.Equal(HttpStatusCode.NotFound, (await pair.PartnerClient.GetAsync($"/api/contacts/{jonas}/entries", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await TryPaymentAsync(pair.PartnerClient, jonas, "toContact", "5.00")).StatusCode);
        await AssertProblemAsync(
            await TrySplitAsync(pair.PartnerClient, new { transactionId = partnersRow, method = "equal", own = new { }, shares = new[] { Share(jonas) } }),
            HttpStatusCode.BadRequest,
            "reference.notFound");
    }

    [Fact]
    public async Task A_split_with_people_is_refused_for_what_the_caller_did_not_pay_and_for_bad_shares()
    {
        using var pair = await CreateHouseholdPairAsync();
        var jonas = await ContactAsync(pair.OwnerClient, "Jonas");
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var partners = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.PartnerClient);
        var housematesRow = await ExpenseAsync(pair.PartnerClient, partners, "20.00", "Paid by the partner");
        var mine = await ExpenseAsync(pair.OwnerClient, shared, "20.00", "Paid by the owner");
        var income = (await CreateTransactionAsync(pair.OwnerClient, shared, null, "income", "20.00", "2026-09-10")).Id;

        await AssertProblemAsync(await TrySplitAsync(pair.OwnerClient, Split(housematesRow, jonas)), HttpStatusCode.BadRequest, "settleUp.notPayer");
        await AssertProblemAsync(await TrySplitAsync(pair.OwnerClient, Split(income, jonas)), HttpStatusCode.BadRequest, "settleUp.notExpense");
        await AssertProblemAsync(await TrySplitAsync(pair.OwnerClient, Split(Guid.NewGuid(), jonas)), HttpStatusCode.BadRequest, "reference.notFound");
        await AssertProblemAsync(await TrySplitAsync(pair.OwnerClient, Split(mine, Guid.NewGuid())), HttpStatusCode.BadRequest, "reference.notFound");
        await AssertProblemAsync(
            await TrySplitAsync(pair.OwnerClient, new { transactionId = mine, method = "equal", own = new { }, shares = Array.Empty<object>() }),
            HttpStatusCode.BadRequest,
            "contact.noPerson");
        await AssertProblemAsync(
            await TrySplitAsync(pair.OwnerClient, new { transactionId = mine, method = "exact", own = new { amount = "10.00" }, shares = new[] { Share(jonas, amount: "9.99") } }),
            HttpStatusCode.BadRequest,
            "settleUp.sharesMismatch");
        await AssertValidationErrorAsync(
            await TrySplitAsync(pair.OwnerClient, new { transactionId = mine, method = "shares", own = new { weight = 0 }, shares = new[] { Share(jonas, weight: 1) } }),
            "own.weight");

        (await pair.OwnerClient.PostAsJsonAsync(
            $"/api/households/{pair.HouseholdId}/shared-expenses",
            new { transactionId = mine, method = "equal", shares = new[] { new { userId = pair.Owner.Id }, new { userId = pair.Partner.Id } } },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        await AssertProblemAsync(await TrySplitAsync(pair.OwnerClient, Split(mine, jonas)), HttpStatusCode.Conflict, "settleUp.alreadySplit");

        var other = await ExpenseAsync(pair.OwnerClient, shared, "12.00", "Lunch");
        await SplitAsync(pair.OwnerClient, Split(other, jonas));
        await AssertProblemAsync(await TrySplitAsync(pair.OwnerClient, Split(other, jonas)), HttpStatusCode.Conflict, "settleUp.alreadySplit");
        await AssertProblemAsync(
            await pair.OwnerClient.PostAsJsonAsync(
                $"/api/households/{pair.HouseholdId}/shared-expenses",
                new { transactionId = other, method = "equal", shares = new[] { new { userId = pair.Owner.Id }, new { userId = pair.Partner.Id } } },
                TestContext.Current.CancellationToken),
            HttpStatusCode.Conflict,
            "settleUp.alreadySplit");
    }

    [Fact]
    public async Task Money_lent_through_a_bank_payment_is_a_split_you_take_no_part_in_and_an_edit_follows_the_transaction()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: client);
        var jonas = await ContactAsync(client, "Jonas");
        var ona = await ContactAsync(client, "Ona");
        var loan = await ExpenseAsync(client, account, "100.00", "To Jonas");

        var split = await SplitAsync(client, new { transactionId = loan, method = "equal", own = (object?)null, shares = new[] { Share(jonas) } });
        Assert.Null(split.OwnAmount);
        Assert.Equal("100.00", Balance(await PeopleAsync(client), jonas));

        (await client.PutAsJsonAsync(
            $"/api/transactions/{loan}",
            new { accountId = account, type = "expense", amount = "120.00", date = "2026-09-10", description = "To Jonas and Ona" },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Equal("100.00", Balance(await PeopleAsync(client), jonas));

        var edited = await ReadOkAsync<ContactSplitDto>(await client.PutAsJsonAsync(
            $"/api/contacts/splits/{split.Id}",
            new { method = "shares", own = (object?)null, shares = new[] { Share(jonas, weight: 2), Share(ona, weight: 1) } },
            TestContext.Current.CancellationToken));

        Assert.Equal([("Jonas", 2, "80.00"), ("Ona", 1, "40.00")], edited.Shares.Select(s => (s.Name, s.Weight ?? 0, s.Amount)));
        var people = await PeopleAsync(client);
        Assert.Equal("80.00", Balance(people, jonas));
        Assert.Equal("40.00", Balance(people, ona));
        var row = await ReadOkAsync<LedgerRowDto>(await client.GetAsync($"/api/transactions/{loan}", TestContext.Current.CancellationToken));
        Assert.Equal(split.Id, row.ContactSplit!.Id);
    }

    [Fact]
    public async Task A_deleted_transaction_stops_its_split_counting_until_it_is_restored()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: client);
        var jonas = await ContactAsync(client, "Jonas");
        var dinner = await ExpenseAsync(client, account, "40.00", "Dinner");
        await SplitAsync(client, Split(dinner, jonas));

        (await client.DeleteAsync($"/api/transactions/{dinner}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Null(Balance(await PeopleAsync(client), jonas));
        Assert.False((await EntriesAsync(client, jonas)).Items.Single().Counted);

        (await client.PostAsJsonAsync("/api/trash/restore", new { kind = "transaction", entityId = dinner }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        Assert.Equal("20.00", Balance(await PeopleAsync(client), jonas));
    }

    [Fact]
    public async Task People_splits_and_payments_come_back_from_the_trash()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: client);
        var jonas = await ContactAsync(client, "Jonas");
        var dinner = await ExpenseAsync(client, account, "40.00", "Dinner");
        var split = await SplitAsync(client, Split(dinner, jonas));
        var payment = await PaymentAsync(client, jonas, "fromContact", "5.00");

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/contacts/splits/{split.Id}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/contacts/payments/{payment.Id}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Null(Balance(await PeopleAsync(client), jonas));
        Assert.Null((await ReadOkAsync<LedgerRowDto>(await client.GetAsync($"/api/transactions/{dinner}", TestContext.Current.CancellationToken))).ContactSplit);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/contacts/{jonas}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Empty(await PeopleAsync(client));

        var trash = await ReadOkAsync<PageDto<TrashRow>>(await client.GetAsync("/api/trash", TestContext.Current.CancellationToken));
        Assert.Contains(trash.Items, row => row is { Kind: "contact", Description: "Jonas" });
        Assert.Contains(trash.Items, row => row is { Kind: "contactPayment", Description: "Jonas paid you 5.00 EUR" });
        Assert.Contains(trash.Items, row => row.Kind == "contactSplit" && row.EntityId == split.Id);
        await AssertProblemAsync(
            await client.PostAsJsonAsync("/api/trash/restore", new { kind = "contactPayment", entityId = payment.Id }, TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "restore.referenceMissing");

        foreach (var (kind, id) in new[] { ("contact", jonas), ("contactSplit", split.Id), ("contactPayment", payment.Id) })
        {
            (await client.PostAsJsonAsync("/api/trash/restore", new { kind, entityId = id }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        }

        Assert.Equal("15.00", Balance(await PeopleAsync(client), jonas));
    }

    [Fact]
    public async Task A_restored_split_is_refused_when_the_transaction_was_split_again()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: client);
        var jonas = await ContactAsync(client, "Jonas");
        var dinner = await ExpenseAsync(client, account, "40.00", "Dinner");
        var first = await SplitAsync(client, Split(dinner, jonas));
        (await client.DeleteAsync($"/api/contacts/splits/{first.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        await SplitAsync(client, Split(dinner, jonas));

        await AssertProblemAsync(
            await client.PostAsJsonAsync("/api/trash/restore", new { kind = "contactSplit", entityId = first.Id }, TestContext.Current.CancellationToken),
            HttpStatusCode.Conflict,
            "settleUp.alreadySplit");
    }

    [Fact]
    public async Task A_restored_split_is_refused_when_the_expense_became_income_meanwhile()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: client);
        var jonas = await ContactAsync(client, "Jonas");
        var dinner = await ExpenseAsync(client, account, "40.00", "Dinner");
        var split = await SplitAsync(client, Split(dinner, jonas));
        (await client.DeleteAsync($"/api/contacts/splits/{split.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await client.PutAsJsonAsync(
            $"/api/transactions/{dinner}",
            new { accountId = account, type = "income", amount = "40.00", date = "2026-09-10", description = "Dinner" },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        await AssertProblemAsync(
            await client.PostAsJsonAsync("/api/trash/restore", new { kind = "contactSplit", entityId = split.Id }, TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "settleUp.notExpense");
        Assert.Null(Balance(await PeopleAsync(client), jonas));
    }

    [Fact]
    public async Task A_split_with_a_person_stays_when_the_row_moves_to_another_account_of_the_payer_only()
    {
        using var pair = await CreateHouseholdPairAsync();
        var jonas = await ContactAsync(pair.OwnerClient, "Jonas");
        var mine = await CreateAccountAsync(client: pair.OwnerClient);
        var alsoMine = await CreateAccountAsync(client: pair.OwnerClient);
        var partners = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.PartnerClient);
        var dinner = await ExpenseAsync(pair.OwnerClient, mine, "40.00", "Dinner");
        await SplitAsync(pair.OwnerClient, Split(dinner, jonas));

        var refused = await ReadOkAsync<BulkMoveDto>(await pair.OwnerClient.PostAsJsonAsync(
            "/api/transactions/bulk-account",
            new { transactionIds = new[] { dinner }, accountId = partners },
            TestContext.Current.CancellationToken));
        var moved = await ReadOkAsync<BulkMoveDto>(await pair.OwnerClient.PostAsJsonAsync(
            "/api/transactions/bulk-account",
            new { transactionIds = new[] { dinner }, accountId = alsoMine },
            TestContext.Current.CancellationToken));

        Assert.Equal("settleUp.notPayer", refused.Refused.Single().Code);
        Assert.Equal(1, moved.Moved);
    }

    [Fact]
    public async Task People_follow_their_own_switch_and_the_households_switch_and_come_back_unchanged()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: client);
        var jonas = await ContactAsync(client, "Jonas");
        var dinner = await ExpenseAsync(client, account, "40.00", "Dinner");
        await SplitAsync(client, Split(dinner, jonas));

        foreach (var feature in new[] { "people", "households" })
        {
            await using (await FeatureOffAsync(feature))
            {
                await AssertProblemAsync(await client.GetAsync("/api/contacts", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "feature.disabled");
                Assert.Null((await ReadOkAsync<LedgerRowDto>(await client.GetAsync($"/api/transactions/{dinner}", TestContext.Current.CancellationToken))).ContactSplit);
            }
        }

        Assert.NotNull((await ReadOkAsync<LedgerRowDto>(await client.GetAsync($"/api/transactions/{dinner}", TestContext.Current.CancellationToken))).ContactSplit);
        Assert.Equal("20.00", Balance(await PeopleAsync(client), jonas));
    }

    private static object Share(Guid contactId, int? weight = null, string? amount = null) => new { contactId, weight, amount };

    private static object Split(Guid transactionId, Guid contactId) =>
        new { transactionId, method = "equal", own = new { }, shares = new[] { Share(contactId) } };

    private static async Task<Guid> ContactAsync(HttpClient client, string name) =>
        (await PostAsync<IdDto>(client, "/api/contacts", new { name })).Id;

    private static async Task<Guid> ExpenseAsync(HttpClient client, Guid account, string amount, string description) =>
        (await CreateTransactionAsync(client, account, null, "expense", amount, "2026-09-10", description)).Id;

    private static Task<HttpResponseMessage> TrySplitAsync(HttpClient client, object body) =>
        client.PostAsJsonAsync("/api/contacts/splits", body, TestContext.Current.CancellationToken);

    private static async Task<ContactSplitDto> SplitAsync(HttpClient client, object body) =>
        await ReadOkAsync<ContactSplitDto>(await TrySplitAsync(client, body));

    private static Task<HttpResponseMessage> TryPaymentAsync(HttpClient client, Guid contact, string direction, string amount, string currency = "eur") =>
        client.PostAsJsonAsync(
            $"/api/contacts/{contact}/payments",
            new { direction, amount, currency, date = "2026-09-12" },
            TestContext.Current.CancellationToken);

    private static async Task<EntryDto> PaymentAsync(HttpClient client, Guid contact, string direction, string amount, string currency = "eur") =>
        await ReadOkAsync<EntryDto>(await TryPaymentAsync(client, contact, direction, amount, currency));

    private static async Task<List<PersonDto>> PeopleAsync(HttpClient client) =>
        await ReadOkAsync<List<PersonDto>>(await client.GetAsync("/api/contacts", TestContext.Current.CancellationToken));

    private static async Task<PageDto<EntryDto>> EntriesAsync(HttpClient client, Guid contact) =>
        await ReadOkAsync<PageDto<EntryDto>>(await client.GetAsync($"/api/contacts/{contact}/entries", TestContext.Current.CancellationToken));

    private static string? Balance(List<PersonDto> people, Guid contact, string currency = "eur") =>
        people.Find(p => p.Id == contact)?.Balances.Find(b => b.Currency == currency)?.Amount;

    private sealed record BalanceDto(string Currency, string Amount);

    private sealed record PersonDto(Guid Id, string Name, List<BalanceDto> Balances);

    private sealed record ShareDto(Guid ContactId, string Name, int? Weight, string Amount);

    private sealed record ContactSplitDto(Guid Id, string Method, int? OwnWeight, string? OwnAmount, List<ShareDto> Shares);

    private sealed record EntryDto(Guid Id, string Kind, string? Description, string Amount, string Currency, string? Direction, bool Counted);

    private sealed record LedgerRowDto(Guid Id, ContactSplitDto? ContactSplit);

    private sealed record RefusalDto(Guid TransactionId, string Code);

    private sealed record BulkMoveDto(int Moved, List<RefusalDto> Refused);
}
