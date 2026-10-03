using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Tests.Integration.Households;

[Collection<PeopleCollection>]
public sealed class SettleUpTests(PeopleFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Equal_weighted_and_exact_splits_of_a_personal_expense_reach_the_partner_but_the_transaction_does_not()
    {
        using var pair = await CreateHouseholdPairAsync();
        var (owner, partner) = (pair.Owner.Id, pair.Partner.Id);
        var account = await CreateAccountAsync(client: pair.OwnerClient);
        var groceries = await ExpenseAsync(pair.OwnerClient, account, "90.00", "Maxima");
        var dinner = await ExpenseAsync(pair.OwnerClient, account, "30.00", "Dinner");
        var cinema = await ExpenseAsync(pair.OwnerClient, account, "10.00", "Cinema");

        var equal = await SplitAsync(pair.OwnerClient, pair.HouseholdId, groceries, "equal", Share(owner), Share(partner));
        var weighted = await SplitAsync(pair.OwnerClient, pair.HouseholdId, dinner, "shares", Share(owner, weight: 2), Share(partner, weight: 1));
        var exact = await SplitAsync(pair.OwnerClient, pair.HouseholdId, cinema, "exact", Share(owner, amount: "4.00"), Share(partner, amount: "6.00"));

        Assert.Equal(["45.00", "45.00"], equal.Shares.Select(s => s.Amount));
        Assert.Equal("20.00", weighted.Shares.Single(s => s.UserId == owner && s.Weight == 2).Amount);
        Assert.Equal("10.00", weighted.Shares.Single(s => s.UserId == partner).Amount);
        Assert.Equal("6.00", exact.Shares.Single(s => s.UserId == partner).Amount);
        Assert.Equal(groceries, equal.TransactionId);

        var seen = await ExpensesAsync(pair.PartnerClient, pair.HouseholdId);
        var partnerView = seen.Items.Single(e => e.Id == equal.Id);
        Assert.Equal("Maxima", partnerView.Description);
        Assert.Equal("45.00", partnerView.MyShare);
        Assert.Null(partnerView.TransactionId);
        Assert.Null(partnerView.AmountDiffers);
        Assert.Equal(HttpStatusCode.NotFound, (await pair.PartnerClient.GetAsync($"/api/transactions/{groceries}", TestContext.Current.CancellationToken)).StatusCode);

        var balances = await BalancesAsync(pair.PartnerClient, pair.HouseholdId);
        Assert.Equal("61.00", Balance(balances, owner));
        Assert.Equal("-61.00", Balance(balances, partner));
        Assert.Equal([new PaymentDto(partner, owner, "eur", "61.00")], Payments(balances, "eur"));
    }

    [Fact]
    public async Task A_split_is_refused_for_what_the_caller_did_not_pay_and_for_bad_shares()
    {
        using var pair = await CreateHouseholdPairAsync();
        var (owner, partner) = (pair.Owner.Id, pair.Partner.Id);
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var housematesRow = await ExpenseAsync(pair.PartnerClient, shared, "20.00", "Paid by the partner");
        var mine = await ExpenseAsync(pair.OwnerClient, shared, "20.00", "Paid by the owner");
        var income = (await CreateTransactionAsync(pair.OwnerClient, shared, null, "income", "20.00", "2026-09-10")).Id;
        using var outsider = await CreateUserClientAsync();
        var stranger = await CreateUserAsync();

        await AssertProblemAsync(await TrySplitAsync(pair.PartnerClient, pair.HouseholdId, housematesRow, "equal", Share(owner), Share(partner)), HttpStatusCode.BadRequest, "settleUp.notPayer");
        await AssertProblemAsync(await TrySplitAsync(pair.OwnerClient, pair.HouseholdId, income, "equal", Share(owner), Share(partner)), HttpStatusCode.BadRequest, "settleUp.notExpense");
        await AssertProblemAsync(await TrySplitAsync(pair.OwnerClient, pair.HouseholdId, mine, "equal", Share(owner)), HttpStatusCode.BadRequest, "settleUp.noOtherMember");
        await AssertProblemAsync(await TrySplitAsync(pair.OwnerClient, pair.HouseholdId, mine, "equal", Share(owner), Share(stranger.Id)), HttpStatusCode.BadRequest, "household.notMember");
        await AssertProblemAsync(await TrySplitAsync(pair.OwnerClient, pair.HouseholdId, mine, "exact", Share(owner, amount: "10.00"), Share(partner, amount: "9.99")), HttpStatusCode.BadRequest, "settleUp.sharesMismatch");
        await AssertProblemAsync(await TrySplitAsync(pair.OwnerClient, pair.HouseholdId, Guid.NewGuid(), "equal", Share(owner), Share(partner)), HttpStatusCode.BadRequest, "reference.notFound");
        await AssertValidationErrorAsync(await TrySplitAsync(pair.OwnerClient, pair.HouseholdId, mine, "shares", Share(owner, weight: 0), Share(partner, weight: 1)), "shares[0].weight");
        Assert.Equal(HttpStatusCode.NotFound, (await TrySplitAsync(outsider, pair.HouseholdId, mine, "equal", Share(owner), Share(partner))).StatusCode);

        await SplitAsync(pair.OwnerClient, pair.HouseholdId, mine, "equal", Share(owner), Share(partner));
        await AssertProblemAsync(await TrySplitAsync(pair.OwnerClient, pair.HouseholdId, mine, "equal", Share(owner), Share(partner)), HttpStatusCode.Conflict, "settleUp.alreadySplit");
    }

    [Fact]
    public async Task Only_the_payer_changes_a_split_and_a_refresh_follows_a_corrected_transaction()
    {
        using var pair = await CreateHouseholdPairAsync();
        var (owner, partner) = (pair.Owner.Id, pair.Partner.Id);
        var account = await CreateAccountAsync(client: pair.OwnerClient);
        var groceries = await ExpenseAsync(pair.OwnerClient, account, "90.00", "Maxima");
        var split = await SplitAsync(pair.OwnerClient, pair.HouseholdId, groceries, "equal", Share(owner), Share(partner));
        var url = $"/api/households/{pair.HouseholdId}/shared-expenses/{split.Id}";

        await AssertProblemAsync(
            await pair.PartnerClient.PutAsJsonAsync(url, new { method = "equal", shares = new[] { Share(partner) } }, TestContext.Current.CancellationToken),
            HttpStatusCode.Forbidden,
            "access.forbidden");
        Assert.Equal(HttpStatusCode.Forbidden, (await pair.PartnerClient.DeleteAsync(url, TestContext.Current.CancellationToken)).StatusCode);

        var corrected = await ReadOkAsync<LedgerRowDto>(await pair.OwnerClient.PutAsJsonAsync(
            $"/api/transactions/{groceries}",
            new { accountId = account, type = "expense", amount = "96.00", date = "2026-09-10", description = "Maxima" },
            TestContext.Current.CancellationToken));
        Assert.True(corrected.SharedExpense!.AmountDiffers);
        var ledger = await ReadOkAsync<PageDto<LedgerRowDto>>(await pair.OwnerClient.GetAsync("/api/transactions?pageSize=200", TestContext.Current.CancellationToken));
        Assert.True(ledger.Items.Single(t => t.Id == groceries).SharedExpense!.AmountDiffers);
        Assert.True((await ExpensesAsync(pair.OwnerClient, pair.HouseholdId)).Items.Single().AmountDiffers);

        var kept = await ReadOkAsync<SharedExpenseDto>(await pair.OwnerClient.PutAsJsonAsync(
            url,
            new { method = "shares", shares = new[] { Share(owner, weight: 1), Share(partner, weight: 2) } },
            TestContext.Current.CancellationToken));
        Assert.Equal("90.00", kept.Amount);
        Assert.Equal("60.00", kept.Shares.Single(s => s.UserId == partner).Amount);

        var refreshed = await ReadOkAsync<SharedExpenseDto>(await pair.OwnerClient.PutAsJsonAsync(
            url,
            new { method = "equal", shares = new[] { Share(owner), Share(partner) }, refreshFromTransaction = true },
            TestContext.Current.CancellationToken));
        Assert.Equal("96.00", refreshed.Amount);
        Assert.Equal(["48.00", "48.00"], refreshed.Shares.Select(s => s.Amount));
        Assert.False(refreshed.AmountDiffers);
    }

    [Fact]
    public async Task The_ledger_marks_a_split_for_the_payer_only()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var groceries = await ExpenseAsync(pair.OwnerClient, shared, "30.00", "Rimi");
        var split = await SplitAsync(pair.OwnerClient, pair.HouseholdId, groceries, "equal", Share(pair.Owner.Id), Share(pair.Partner.Id));

        var payerRow = (await LedgerAsync(pair.OwnerClient)).Single(t => t.Id == groceries);
        var partnerRow = (await LedgerAsync(pair.PartnerClient)).Single(t => t.Id == groceries);

        Assert.Equal(split.Id, payerRow.SharedExpense!.Id);
        Assert.Equal(pair.HouseholdId, payerRow.SharedExpense.HouseholdId);
        Assert.Equal("15.00", payerRow.SharedExpense.MyShare);
        Assert.False(payerRow.SharedExpense.AmountDiffers);
        Assert.Null(partnerRow.SharedExpense);
        var single = await ReadOkAsync<LedgerRowDto>(await pair.OwnerClient.GetAsync($"/api/transactions/{groceries}", TestContext.Current.CancellationToken));
        Assert.Equal(split.Id, single.SharedExpense!.Id);
    }

    [Fact]
    public async Task A_deleted_transaction_stops_its_split_counting_until_it_is_restored()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync(client: pair.OwnerClient);
        var groceries = await ExpenseAsync(pair.OwnerClient, account, "40.00", "Iki");
        await SplitAsync(pair.OwnerClient, pair.HouseholdId, groceries, "equal", Share(pair.Owner.Id), Share(pair.Partner.Id));

        (await pair.OwnerClient.DeleteAsync($"/api/transactions/{groceries}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Empty((await BalancesAsync(pair.PartnerClient, pair.HouseholdId)).Balances);
        Assert.False((await ExpensesAsync(pair.PartnerClient, pair.HouseholdId)).Items.Single().Counted);

        (await pair.OwnerClient.PostAsJsonAsync("/api/trash/restore", new { kind = "transaction", entityId = groceries }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

        Assert.Equal("-20.00", Balance(await BalancesAsync(pair.PartnerClient, pair.HouseholdId), pair.Partner.Id));
        Assert.True((await ExpensesAsync(pair.PartnerClient, pair.HouseholdId)).Items.Single().Counted);
    }

    [Fact]
    public async Task Balances_in_two_currencies_stay_apart_and_three_members_settle_in_two_payments()
    {
        using var pair = await CreateHouseholdPairAsync();
        var admin = await ReadOkAsync<IdDto>(await Client.GetAsync("/api/auth/me", TestContext.Current.CancellationToken));
        var euros = await CreateAccountAsync(client: pair.OwnerClient);
        var dollars = await CreateAccountAsync(currency: "usd", client: pair.OwnerClient);
        var dinner = await ExpenseAsync(pair.OwnerClient, euros, "90.00", "Dinner");
        var taxi = (await RecordTransactionAsync(
            pair.OwnerClient,
            new { accountId = dollars, type = "expense", amount = "10.00", currency = "usd", date = "2026-09-10", description = "Taxi" })).Id;

        await SplitAsync(pair.OwnerClient, pair.HouseholdId, dinner, "equal", Share(pair.Owner.Id), Share(pair.Partner.Id), Share(admin.Id));
        await SplitAsync(pair.OwnerClient, pair.HouseholdId, taxi, "equal", Share(pair.Owner.Id), Share(pair.Partner.Id));

        var balances = await BalancesAsync(pair.PartnerClient, pair.HouseholdId);
        Assert.Equal("60.00", Balance(balances, pair.Owner.Id, "eur"));
        Assert.Equal("5.00", Balance(balances, pair.Owner.Id, "usd"));
        Assert.Equal("-30.00", Balance(balances, admin.Id, "eur"));
        Assert.Null(balances.Balances.Find(b => b.UserId == admin.Id && b.Currency == "usd"));
        var euroPayments = balances.Payments.Where(p => p.Currency == "eur").ToList();
        Assert.Equal(2, euroPayments.Count);
        Assert.All(euroPayments, p => Assert.Equal(pair.Owner.Id, p.ToUserId));
        Assert.Equal([new PaymentDto(pair.Partner.Id, pair.Owner.Id, "usd", "5.00")], Payments(balances, "usd"));
    }

    [Fact]
    public async Task A_payment_writes_a_transfer_only_between_accounts_of_the_two_that_the_recorder_can_see()
    {
        using var pair = await CreateHouseholdPairAsync();
        var (owner, partner) = (pair.Owner.Id, pair.Partner.Id);
        var mine = await CreateAccountAsync("100.00", client: pair.OwnerClient);
        var mineInDollars = await CreateAccountAsync("100.00", currency: "usd", client: pair.OwnerClient);
        var partnersShared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.PartnerClient);
        var partnersPersonal = await CreateAccountAsync(client: pair.PartnerClient);
        var groceries = await ExpenseAsync(pair.PartnerClient, partnersPersonal, "60.00", "Lidl");
        await SplitAsync(pair.PartnerClient, pair.HouseholdId, groceries, "equal", Share(owner), Share(partner));
        var url = $"/api/households/{pair.HouseholdId}/settlements";

        object Payment(Guid from, Guid to, object? transfer = null, string currency = "eur") =>
            new { fromUserId = owner, toUserId = partner, amount = "30.00", currency, date = "2026-09-12", note = "Groceries", transfer = transfer ?? new { fromAccountId = from, toAccountId = to } };

        await AssertProblemAsync(await pair.OwnerClient.PostAsJsonAsync(url, Payment(mine, partnersPersonal), TestContext.Current.CancellationToken), HttpStatusCode.BadRequest, "reference.notFound");
        await AssertProblemAsync(await pair.OwnerClient.PostAsJsonAsync(url, Payment(partnersShared, mine), TestContext.Current.CancellationToken), HttpStatusCode.BadRequest, "settleUp.accountOwner");
        await AssertProblemAsync(await pair.OwnerClient.PostAsJsonAsync(url, Payment(mineInDollars, partnersShared), TestContext.Current.CancellationToken), HttpStatusCode.BadRequest, "settleUp.currencyMismatch");
        await AssertProblemAsync(
            await Client.PostAsJsonAsync(url, new { fromUserId = owner, toUserId = partner, amount = "30.00", currency = "eur", date = "2026-09-12" }, TestContext.Current.CancellationToken),
            HttpStatusCode.Forbidden,
            "access.forbidden");
        await AssertProblemAsync(
            await pair.OwnerClient.PostAsJsonAsync(url, new { fromUserId = owner, toUserId = owner, amount = "30.00", currency = "eur", date = "2026-09-12" }, TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "settleUp.samePerson");

        var paid = await ReadOkAsync<SettlementDto>(await pair.OwnerClient.PostAsJsonAsync(url, Payment(mine, partnersShared), TestContext.Current.CancellationToken));

        Assert.True(paid.HasTransfer);
        Assert.Empty((await BalancesAsync(pair.OwnerClient, pair.HouseholdId)).Balances);
        var transfers = await ReadOkAsync<PageDto<TransferRowDto>>(await pair.PartnerClient.GetAsync("/api/transfers?pageSize=200", TestContext.Current.CancellationToken));
        var transfer = transfers.Items.Single(t => t.ToAccountId == partnersShared);
        Assert.Equal(mine, transfer.FromAccountId);
        Assert.Equal("70.00", await CurrentBalanceAsync(mine, pair.OwnerClient));

        (await pair.PartnerClient.DeleteAsync($"{url}/{paid.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal("-30.00", Balance(await BalancesAsync(pair.OwnerClient, pair.HouseholdId), owner));
        Assert.Equal("70.00", await CurrentBalanceAsync(mine, pair.OwnerClient));

        await AssertProblemAsync(
            await pair.PartnerClient.PostAsJsonAsync(url, new { fromUserId = owner, toUserId = partner, amount = "30.00", currency = "eur", date = "2026-09-12", transferId = transfer.Id }, TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "reference.notFound");
        var linked = await ReadOkAsync<SettlementDto>(await pair.OwnerClient.PostAsJsonAsync(
            url,
            new { fromUserId = owner, toUserId = partner, amount = "30.00", currency = "eur", date = "2026-09-12", transferId = transfer.Id },
            TestContext.Current.CancellationToken));
        Assert.True(linked.HasTransfer);
        await AssertProblemAsync(
            await pair.OwnerClient.PostAsJsonAsync(url, new { fromUserId = owner, toUserId = partner, amount = "30.00", currency = "eur", date = "2026-09-12", transferId = transfer.Id }, TestContext.Current.CancellationToken),
            HttpStatusCode.Conflict,
            "settleUp.transferTaken");
    }

    [Fact]
    public async Task A_payment_without_accounts_touches_no_account()
    {
        using var pair = await CreateHouseholdPairAsync();
        var mine = await CreateAccountAsync("100.00", client: pair.OwnerClient);

        var paid = await ReadOkAsync<SettlementDto>(await pair.PartnerClient.PostAsJsonAsync(
            $"/api/households/{pair.HouseholdId}/settlements",
            new { fromUserId = pair.Owner.Id, toUserId = pair.Partner.Id, amount = "12.50", currency = "eur", date = "2026-09-12" },
            TestContext.Current.CancellationToken));

        Assert.False(paid.HasTransfer);
        Assert.Equal("100.00", await CurrentBalanceAsync(mine, pair.OwnerClient));
        Assert.Equal("12.50", Balance(await BalancesAsync(pair.OwnerClient, pair.HouseholdId), pair.Owner.Id));
        Assert.Equal(paid.Id, (await SettlementsAsync(pair.OwnerClient, pair.HouseholdId)).Items.Single().Id);
    }

    [Fact]
    public async Task A_removed_member_loses_sight_while_the_others_keep_their_balance_and_can_settle_it()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync(client: pair.OwnerClient);
        var groceries = await ExpenseAsync(pair.OwnerClient, account, "50.00", "Maxima");
        await SplitAsync(pair.OwnerClient, pair.HouseholdId, groceries, "equal", Share(pair.Owner.Id), Share(pair.Partner.Id));

        (await Client.DeleteAsync($"/api/households/{pair.HouseholdId}/members/{pair.Partner.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.NotFound, (await pair.PartnerClient.GetAsync($"/api/households/{pair.HouseholdId}/settle-up", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await pair.PartnerClient.GetAsync($"/api/households/{pair.HouseholdId}/shared-expenses", TestContext.Current.CancellationToken)).StatusCode);
        var balances = await BalancesAsync(pair.OwnerClient, pair.HouseholdId);
        var former = balances.Balances.Single(b => b.UserId == pair.Partner.Id);
        Assert.False(former.IsMember);
        Assert.Equal("-25.00", former.Amount);

        await ReadOkAsync<SettlementDto>(await pair.OwnerClient.PostAsJsonAsync(
            $"/api/households/{pair.HouseholdId}/settlements",
            new { fromUserId = pair.Partner.Id, toUserId = pair.Owner.Id, amount = "25.00", currency = "eur", date = "2026-09-12" },
            TestContext.Current.CancellationToken));

        Assert.Empty((await BalancesAsync(pair.OwnerClient, pair.HouseholdId)).Balances);
        await AssertProblemAsync(
            await pair.OwnerClient.PostAsJsonAsync(
                $"/api/households/{pair.HouseholdId}/settlements",
                new { fromUserId = pair.Partner.Id, toUserId = pair.Owner.Id, amount = "1.00", currency = "eur", date = "2026-09-12" },
                TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "household.notMember");
    }

    [Fact]
    public async Task Splits_and_payments_stay_inside_their_household_and_the_active_one()
    {
        using var pair = await CreateHouseholdPairAsync();
        var other = await CreateHouseholdAsync(pair.Owner, pair.Partner);
        var account = await CreateAccountAsync(client: pair.OwnerClient);
        var groceries = await ExpenseAsync(pair.OwnerClient, account, "50.00", "Maxima");
        var split = await SplitAsync(pair.OwnerClient, pair.HouseholdId, groceries, "equal", Share(pair.Owner.Id), Share(pair.Partner.Id));
        using var outsider = await CreateUserClientAsync();
        var home = $"/api/households/{pair.HouseholdId}";

        foreach (var path in new[] { "/settle-up", "/shared-expenses", "/settlements" })
        {
            Assert.Equal(HttpStatusCode.NotFound, (await outsider.GetAsync(home + path, TestContext.Current.CancellationToken)).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await SendScopedAsync(pair.PartnerClient, HttpMethod.Get, home + path, other)).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await SendScopedAsync(pair.PartnerClient, HttpMethod.Get, home + path, pair.HouseholdId)).StatusCode);
        }

        Assert.Equal(HttpStatusCode.NotFound, (await outsider.DeleteAsync($"{home}/shared-expenses/{split.Id}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await SendScopedAsync(pair.OwnerClient, HttpMethod.Delete, $"{home}/shared-expenses/{split.Id}", other)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await pair.OwnerClient.DeleteAsync($"/api/households/{other}/shared-expenses/{split.Id}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Empty((await ExpensesAsync(pair.PartnerClient, other)).Items);
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await outsider.PostAsJsonAsync($"{home}/settlements", new { fromUserId = pair.Owner.Id, toUserId = pair.Partner.Id, amount = "1.00", currency = "eur", date = "2026-09-12" }, TestContext.Current.CancellationToken)).StatusCode);

        (await Client.DeleteAsync(home, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NotFound, (await pair.PartnerClient.GetAsync($"{home}/settle-up", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(0, await WithDbAsync(pair.Partner.Id, db => db.SharedExpenses.CountAsync(TestContext.Current.CancellationToken)));

        (await Client.PostAsJsonAsync("/api/trash/restore", new { kind = "household", entityId = pair.HouseholdId }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        Assert.Equal("-25.00", Balance(await BalancesAsync(pair.PartnerClient, pair.HouseholdId), pair.Partner.Id));
    }

    [Fact]
    public async Task Splits_and_payments_come_back_from_the_trash_and_are_logged_for_the_household()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync(client: pair.OwnerClient);
        var groceries = await ExpenseAsync(pair.OwnerClient, account, "90.00", "Maxima");
        var split = await SplitAsync(pair.OwnerClient, pair.HouseholdId, groceries, "equal", Share(pair.Owner.Id), Share(pair.Partner.Id));
        var home = $"/api/households/{pair.HouseholdId}";
        (await pair.OwnerClient.PutAsJsonAsync(
            $"{home}/shared-expenses/{split.Id}",
            new { method = "exact", shares = new[] { Share(pair.Owner.Id, amount: "30.00"), Share(pair.Partner.Id, amount: "60.00") } },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var paid = await ReadOkAsync<SettlementDto>(await pair.PartnerClient.PostAsJsonAsync(
            $"{home}/settlements",
            new { fromUserId = pair.Partner.Id, toUserId = pair.Owner.Id, amount = "30.00", currency = "eur", date = "2026-09-12" },
            TestContext.Current.CancellationToken));

        (await pair.OwnerClient.DeleteAsync($"{home}/shared-expenses/{split.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await pair.PartnerClient.DeleteAsync($"{home}/settlements/{paid.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        Assert.Empty((await BalancesAsync(pair.OwnerClient, pair.HouseholdId)).Balances);

        var ownerTrash = await ReadOkAsync<PageDto<TrashRow>>(await pair.OwnerClient.GetAsync("/api/trash", TestContext.Current.CancellationToken));
        Assert.Contains(ownerTrash.Items, row => row.Kind == "sharedExpense" && row.EntityId == split.Id && row.Description == "Maxima, 90.00 EUR, 2 shares");
        (await pair.OwnerClient.PostAsJsonAsync("/api/trash/restore", new { kind = "sharedExpense", entityId = split.Id }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await pair.PartnerClient.PostAsJsonAsync("/api/trash/restore", new { kind = "settlement", entityId = paid.Id }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal("-30.00", Balance(await BalancesAsync(pair.OwnerClient, pair.HouseholdId), pair.Partner.Id));

        var log = await ReadOkAsync<PageDto<AuditRowDto>>(await Client.GetAsync($"{home}/audit?pageSize=50", TestContext.Current.CancellationToken));
        var splitRows = log.Items.Where(e => e.EntityId == split.Id).ToList();
        Assert.Equal(["restored", "deleted", "updated", "created"], splitRows.Select(e => e.Action));
        Assert.All(splitRows, e => Assert.Equal("sharedExpense", e.EntityKind));
        Assert.Equal("Maxima, 90.00 EUR, 2 shares", splitRows[^1].Description);
        var shares = splitRows[2].Changes.Single(c => c.Field == "shares");
        Assert.Contains("45.00", shares.From);
        Assert.Contains("60.00", shares.To);
        var paymentRows = log.Items.Where(e => e.EntityId == paid.Id).ToList();
        Assert.Equal(["restored", "deleted", "created"], paymentRows.Select(e => e.Action));
        Assert.All(paymentRows, e => Assert.EndsWith(" 30.00 EUR", e.Description));
        Assert.Contains(" paid ", paymentRows[^1].Description);
    }

    [Fact]
    public async Task A_restored_split_is_refused_when_the_expense_moved_to_another_members_account_meanwhile()
    {
        using var pair = await CreateHouseholdPairAsync();
        var mine = await CreateAccountAsync(client: pair.OwnerClient);
        var partners = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.PartnerClient);
        var groceries = await ExpenseAsync(pair.OwnerClient, mine, "90.00", "Maxima");
        var split = await SplitAsync(pair.OwnerClient, pair.HouseholdId, groceries, "equal", Share(pair.Owner.Id), Share(pair.Partner.Id));
        (await pair.OwnerClient.DeleteAsync($"/api/households/{pair.HouseholdId}/shared-expenses/{split.Id}", TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        (await pair.OwnerClient.PostAsJsonAsync(
            "/api/transactions/bulk-account",
            new { transactionIds = new[] { groceries }, accountId = partners },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        await AssertProblemAsync(
            await pair.OwnerClient.PostAsJsonAsync("/api/trash/restore", new { kind = "sharedExpense", entityId = split.Id }, TestContext.Current.CancellationToken),
            HttpStatusCode.BadRequest,
            "settleUp.notPayer");
        Assert.Empty((await BalancesAsync(pair.OwnerClient, pair.HouseholdId)).Balances);
    }

    private static object Share(Guid userId, int? weight = null, string? amount = null) => new { userId, weight, amount };

    private static async Task<Guid> ExpenseAsync(HttpClient client, Guid account, string amount, string description) =>
        (await CreateTransactionAsync(client, account, null, "expense", amount, "2026-09-10", description)).Id;

    private static Task<HttpResponseMessage> TrySplitAsync(HttpClient client, Guid household, Guid transactionId, string method, params object[] shares) =>
        client.PostAsJsonAsync($"/api/households/{household}/shared-expenses", new { transactionId, method, shares }, TestContext.Current.CancellationToken);

    private static async Task<SharedExpenseDto> SplitAsync(HttpClient client, Guid household, Guid transactionId, string method, params object[] shares) =>
        await ReadOkAsync<SharedExpenseDto>(await TrySplitAsync(client, household, transactionId, method, shares));

    private static async Task<SettleUpDto> BalancesAsync(HttpClient client, Guid household) =>
        await ReadOkAsync<SettleUpDto>(await client.GetAsync($"/api/households/{household}/settle-up", TestContext.Current.CancellationToken));

    private static async Task<PageDto<SharedExpenseDto>> ExpensesAsync(HttpClient client, Guid household) =>
        await ReadOkAsync<PageDto<SharedExpenseDto>>(await client.GetAsync($"/api/households/{household}/shared-expenses", TestContext.Current.CancellationToken));

    private static async Task<PageDto<SettlementDto>> SettlementsAsync(HttpClient client, Guid household) =>
        await ReadOkAsync<PageDto<SettlementDto>>(await client.GetAsync($"/api/households/{household}/settlements", TestContext.Current.CancellationToken));

    private static async Task<List<LedgerRowDto>> LedgerAsync(HttpClient client) =>
        (await ReadOkAsync<PageDto<LedgerRowDto>>(await client.GetAsync("/api/transactions?pageSize=200", TestContext.Current.CancellationToken))).Items;

    private static List<PaymentDto> Payments(SettleUpDto balances, string currency) =>
        [.. balances.Payments.Where(p => p.Currency == currency).Select(p => new PaymentDto(p.FromUserId, p.ToUserId, p.Currency, p.Amount))];

    private static string? Balance(SettleUpDto balances, Guid userId, string currency = "eur") =>
        balances.Balances.Find(b => b.UserId == userId && b.Currency == currency)?.Amount;

    private sealed record SettleUpDto(List<BalanceLineDto> Balances, List<SuggestionDto> Payments);

    private sealed record BalanceLineDto(Guid UserId, string Name, bool IsMember, string Currency, string Amount);

    private sealed record SuggestionDto(Guid FromUserId, string FromName, Guid ToUserId, string ToName, string Currency, string Amount);

    private sealed record PaymentDto(Guid FromUserId, Guid ToUserId, string Currency, string Amount);

    private sealed record ShareDto(Guid UserId, string Name, int? Weight, string Amount);

    private sealed record SharedExpenseDto(
        Guid Id,
        Guid PayerId,
        string? Description,
        string Amount,
        List<ShareDto> Shares,
        string? MyShare,
        bool Counted,
        Guid? TransactionId,
        bool? AmountDiffers);

    private sealed record SettlementDto(Guid Id, Guid FromUserId, Guid ToUserId, string Amount, string Currency, bool HasTransfer);

    private sealed record LedgerMarkDto(Guid Id, Guid HouseholdId, string HouseholdName, string MyShare, bool AmountDiffers);

    private sealed record LedgerRowDto(Guid Id, LedgerMarkDto? SharedExpense);

    private sealed record TransferRowDto(Guid Id, Guid FromAccountId, Guid ToAccountId);

    private sealed record AuditChangeDto(string Field, string? From, string? To);

    private sealed record AuditRowDto(Guid? EntityId, string Action, string EntityKind, string Description, List<AuditChangeDto> Changes);
}
