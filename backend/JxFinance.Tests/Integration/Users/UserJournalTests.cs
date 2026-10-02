using System.Globalization;
using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using JxFinance.Common.Journal;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Users.Services;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using JxFinance.Tests.Support.Journal;

namespace JxFinance.Tests.Integration.Users;

[Collection<IntegrationCollection>]
public sealed class UserJournalTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private static readonly HashSet<string> CurrencyCodes = Enum.GetValues<Currency>().Select(c => c.ToCode()).ToHashSet(StringComparer.Ordinal);

    [Fact]
    public async Task The_seeded_ledger_exports_a_journal_whose_assertions_are_the_balances_the_accounts_page_shows()
    {
        var member = await CreateUserAsync();
        await DemoDataCommand.RunAsync(Services, member.Email);
        using var client = await LoginAsync(member);

        var journal = JournalChecker.Accepted(await JournalAsync(client));
        var accounts = await AccountsAsync(client);

        Assert.Equal(3, accounts.Count);
        AssertAgree(journal, accounts);
        Assert.All(journal.Assertions, a => Assert.Equal(Today.AddDays(1), a.Date));
        Assert.Contains(journal.Opens, o => o.Account == "Assets:Owned:Vehicle:Car");
        Assert.Contains(journal.Opens, o => o.Account == "Liabilities:Debts:Car-loan");
        Assert.Single(journal.Assertions, a => a.Account == "Liabilities:Debts:Car-loan" && a.Number == -3200m);
        Assert.Contains(journal.Transactions, t => t.Postings.Any(p => p.Account == "Income:Salary" && p.Number == -2450m));
    }

    [Fact]
    public async Task A_partner_account_is_only_ever_outside_equity()
    {
        using var pair = await CreateHouseholdPairAsync();
        var owner = pair.OwnerClient;
        var mine = await CreateAccountAsync("100.00", client: owner);
        var partnerPersonal = await CreateNamedAccountAsync(pair.PartnerClient, "Partner wallet");
        var partnerShared = await CreateNamedAccountAsync(pair.PartnerClient, "Partner shared", pair.HouseholdId);
        await PostAsync<TransferDto>(owner, "/api/transfers", new { fromAccountId = mine, toAccountId = partnerShared, amount = "30.00", date = "2026-07-04", description = "To partner" });
        await PostAsync<TransferDto>(pair.PartnerClient, "/api/transfers", new { fromAccountId = partnerPersonal, toAccountId = partnerShared, amount = "5.00", date = "2026-07-05" });
        await CreateTransactionAsync(owner, partnerShared, null, "expense", "9.00", "2026-07-06", "Mine on the partner account");

        var text = await JournalAsync(owner);
        var journal = JournalChecker.Accepted(text);

        Assert.Contains(journal.Transactions, t => t.Postings.Any(p => p.Account == "Equity:Outside-Accounts:Partner-shared" && p.Number == 30m));
        Assert.DoesNotContain(journal.Opens, o => o.Account.StartsWith("Assets:", StringComparison.Ordinal) && o.Meta.GetValueOrDefault("name") is "Partner shared" or "Partner wallet");
        Assert.DoesNotContain("Partner wallet", text, StringComparison.Ordinal);
        Assert.DoesNotContain("Mine on the partner account", text, StringComparison.Ordinal);
        Assert.Single(journal.Assertions, a => a.Account.StartsWith("Assets:", StringComparison.Ordinal) && a.Number == 70m);
    }

    [Fact]
    public async Task A_refund_and_a_split_balance()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: client);
        var food = await Seed.CategoryAsync(client, $"Food {Guid.NewGuid():N}"[..12]);
        var home = await Seed.CategoryAsync(client, $"Home {Guid.NewGuid():N}"[..12]);
        await CreateTransactionAsync(client, account, food, "expense", "50.00", "2026-07-01", "Shoes");
        await CreateTransactionAsync(client, account, food, "expense", "-12.00", "2026-07-02", "Shoes returned");
        await RecordTransactionAsync(client, new
        {
            accountId = account,
            type = "expense",
            amount = "30.00",
            date = "2026-07-03",
            description = "Market",
            lines = new object[] { new { categoryId = food, amount = "20.00" }, new { categoryId = home, amount = "7.00" }, new { categoryId = (Guid?)null, amount = "3.00" } },
        });

        var journal = await AcceptedAsync(client);

        var refund = Assert.Single(journal.Transactions, t => t.Narration == "Shoes returned");
        Assert.Equal([12m, -12m], refund.Postings.Select(p => p.Number!.Value));
        var split = Assert.Single(journal.Transactions, t => t.Narration == "Market");
        Assert.Equal([-30m, 3m, 7m, 20m], split.Postings.Select(p => p.Number!.Value).Order());
        Assert.Contains(split.Postings, p => p is { Account: "Expenses:Uncategorized", Number: 3m });
        AssertAgree(journal, await AccountsAsync(client));
    }

    [Fact]
    public async Task A_cross_currency_transfer_and_a_conversion_with_a_fee_balance()
    {
        using var client = await CreateUserClientAsync();
        var euros = await CreateAccountAsync("1000.00", client: client);
        var dollars = await CreateAccountAsync("0.00", currency: "usd", client: client);
        var category = await CreateCategoryAsync(client: client);
        await PostAsync<TransferDto>(client, "/api/transfers", new { fromAccountId = euros, toAccountId = dollars, amount = "100.00", receivedAmount = "108.00", date = "2026-06-06" });
        await PostAsync<IdDto>(client, "/api/conversions", new
        {
            accountId = euros,
            fromAmount = "500.00",
            fromCurrency = "eur",
            toAmount = "550.00",
            toCurrency = "usd",
            date = "2026-06-07",
            feeAmount = "2.50",
            feeCurrency = "eur",
            feeCategoryId = category,
        });

        var journal = await AcceptedAsync(client);

        Assert.Contains(journal.Transactions, t => t.Postings.Any(p => p is { Number: 108m, Commodity: "USD", Price: "@@ 100.00 EUR" }));
        Assert.Contains(journal.Transactions, t => t.Postings.Any(p => p is { Number: 550m, Commodity: "USD", Price: "@@ 500.00 EUR" }));
        Assert.Contains(journal.Transactions, t => t.Postings.Any(p => p is { Number: 2.5m, Commodity: "EUR" } && p.Account.StartsWith("Expenses:", StringComparison.Ordinal)));
        AssertAgree(journal, await AccountsAsync(client));
    }

    [Fact]
    public async Task A_broker_buy_with_taxes_in_its_cash_amount_carries_that_cash_as_its_cost()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        var broker = await CreateAccountAsync("5000.00", type: "investment", client: client);
        var symbol = NewSymbol();
        var security = await CreateSecurityAsync(client, symbol);
        await WithDbAsync(async db =>
        {
            db.InvestmentTransactions.Add(new InvestmentTransaction
            {
                UserId = user.Id,
                AccountId = new AccountId(broker),
                SecurityId = new SecurityId(security),
                Type = InvestmentTransactionType.Buy,
                Date = new DateOnly(2026, 6, 1),
                Quantity = 10m,
                Price = 100m,
                Fee = 1m,
                CashAmount = new Money(-1003.40m, Currency.Eur),
                ReportingAmount = -1003.40m,
                Source = InvestmentSource.InteractiveBrokers,
                ExternalId = $"trade-{Guid.NewGuid():N}",
            });
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });

        var text = await JournalAsync(client);
        var journal = JournalChecker.Accepted(text);

        Assert.Contains($"  10 {symbol} {{{{1003.40 EUR}}}}\n", text, StringComparison.Ordinal);
        Assert.Single(journal.Assertions, a => a.Commodity == symbol && a.Number == 10m);
        AssertAgree(journal, await AccountsAsync(client));
    }

    [Fact]
    public async Task A_symbol_change_a_mixed_merger_and_a_spin_off_balance()
    {
        using var client = await CreateUserClientAsync();
        var broker = await CreateAccountAsync("5000.00", type: "investment", client: client);
        var old = await CreateSecurityAsync(client);
        var renamed = NewSymbol();
        var renamedId = await CreateSecurityAsync(client, renamed);
        var target = await CreateSecurityAsync(client);
        var acquirer = NewSymbol();
        var acquirerId = await CreateSecurityAsync(client, acquirer);
        var parent = await CreateSecurityAsync(client);
        var child = NewSymbol();
        var childId = await CreateSecurityAsync(client, child);
        foreach (var security in new[] { old, target, parent })
        {
            await RecordInvestmentAsync(client, new { accountId = broker, securityId = security, type = "buy", date = "2026-05-04", quantity = "10", price = "50" });
        }

        await RecordInvestmentAsync(client, new { accountId = broker, type = "symbolChange", date = "2026-06-01", securityId = old, relatedSecurityId = renamedId, quantity = "10" });
        await RecordInvestmentAsync(client, new { accountId = broker, type = "merger", date = "2026-06-02", securityId = target, quantity = "10", relatedSecurityId = acquirerId, relatedQuantity = "4", amount = "100", costShare = "80" });
        await RecordInvestmentAsync(client, new { accountId = broker, type = "spinOff", date = "2026-06-03", securityId = parent, relatedSecurityId = childId, relatedQuantity = "5", costShare = "20" });
        await RecordInvestmentAsync(client, new { accountId = broker, securityId = renamedId, type = "sell", date = "2026-06-10", quantity = "4", price = "60" });

        var journal = await AcceptedAsync(client);

        Assert.Single(journal.Assertions, a => a.Commodity == renamed && a.Number == 6m);
        Assert.Single(journal.Assertions, a => a.Commodity == acquirer && a.Number == 4m);
        Assert.Single(journal.Assertions, a => a.Commodity == child && a.Number == 5m);
        AssertAgree(journal, await AccountsAsync(client));
    }

    [Fact]
    public async Task A_sell_across_two_lots_and_a_split_followed_by_a_sell_balance()
    {
        using var client = await CreateUserClientAsync();
        var broker = await CreateAccountAsync("5000.00", type: "investment", client: client);
        var symbol = NewSymbol();
        var security = await CreateSecurityAsync(client, symbol);
        await RecordInvestmentAsync(client, new { accountId = broker, securityId = security, type = "buy", date = "2026-02-02", quantity = "2", price = "100", fee = "1.00" });
        await RecordInvestmentAsync(client, new { accountId = broker, securityId = security, type = "buy", date = "2026-03-02", quantity = "3", price = "150" });
        await RecordInvestmentAsync(client, new { accountId = broker, securityId = security, type = "sell", date = "2026-04-02", quantity = "3", price = "200", fee = "2.00" });
        await RecordInvestmentAsync(client, new { accountId = broker, securityId = security, type = "split", date = "2026-05-02", quantity = "3" });
        await RecordInvestmentAsync(client, new { accountId = broker, securityId = security, type = "sell", date = "2026-06-02", quantity = "4", price = "70" });

        var text = await JournalAsync(client);
        var journal = JournalChecker.Accepted(text);

        Assert.Contains($"  -3 {symbol} {{}} @ 200 EUR\n", text, StringComparison.Ordinal);
        Assert.Contains($"  -2 {symbol} {{}}\n  Assets:", text, StringComparison.Ordinal);
        Assert.Contains($"  6 {symbol} {{{{300.00 EUR, 2026-03-02}}}}\n", text, StringComparison.Ordinal);
        Assert.Single(journal.Assertions, a => a.Commodity == symbol && a.Number == 2m);
        Assert.DoesNotContain(journal.Opens, o => o.Booking is not null);
        AssertAgree(journal, await AccountsAsync(client));
    }

    [Fact]
    public async Task An_oversold_account_books_without_lot_matching_and_keeps_the_app_quantity()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        var broker = await CreateAccountAsync("1000.00", type: "investment", client: client);
        var symbol = NewSymbol();
        var security = await CreateSecurityAsync(client, symbol);
        await RecordInvestmentAsync(client, new { accountId = broker, securityId = security, type = "buy", date = "2026-02-02", quantity = "5", price = "100" });
        await RecordInvestmentAsync(client, new { accountId = broker, securityId = security, type = "buy", date = "2026-04-02", quantity = "2", price = "100" });
        var oversold = InvestmentTransactionId.New();
        await WithDbAsync(async db =>
        {
            db.InvestmentTransactions.Add(new InvestmentTransaction
            {
                Id = oversold,
                UserId = user.Id,
                AccountId = new AccountId(broker),
                SecurityId = new SecurityId(security),
                Type = InvestmentTransactionType.Sell,
                Date = new DateOnly(2026, 3, 2),
                Quantity = 8m,
                Price = 120m,
                CashAmount = new Money(960m, Currency.Eur),
                ReportingAmount = 960m,
                Source = InvestmentSource.InteractiveBrokers,
                ExternalId = $"trade-{Guid.NewGuid():N}",
            });
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });

        var text = await JournalAsync(client);
        var journal = JournalChecker.Accepted(text);

        var open = Assert.Single(journal.Opens, o => o.Booking is not null);
        Assert.Equal(("NONE", oversold.Value.ToString()), (open.Booking, open.Meta["jx-oversold-sale"]));
        Assert.Contains($"  -5 {symbol} {{{{500.00 EUR}}}} @ 120 EUR\n", text, StringComparison.Ordinal);
        Assert.Single(journal.Assertions, a => a.Commodity == symbol && a.Number == 2m);
        AssertAgree(journal, await AccountsAsync(client));
    }

    [Fact]
    public async Task A_tracked_payment_in_another_currency_moves_the_principal_to_the_debt()
    {
        using var client = await CreateUserClientAsync();
        var dollars = await CreateAccountAsync("500.00", currency: "usd", client: client);
        var loans = await CreateCategoryAsync(client: client);
        var debt = (await PostAsync<IdDto>(client, "/api/debts", new { name = "Mortgage", type = "mortgage", outstandingAmount = "1000.00", asOf = "2026-05-01", tracksPayments = true })).Id;
        var payment = await CreateTransactionAsync(client, dollars, loans, "expense", "110.00", "2026-05-10", "Mortgage payment");
        await ReadOkAsync<DebtDto>(await client.PostAsJsonAsync($"/api/debts/{debt}/payments", new { transactionId = payment.Id }, TestContext.Current.CancellationToken));

        var journal = await AcceptedAsync(client);

        var paid = Assert.Single(journal.Transactions, t => t.Narration == "Mortgage payment");
        Assert.Equal("110.00 USD", paid.Meta["jx-category-amount"]);
        var principal = Assert.Single(paid.Postings, p => p.Account == "Liabilities:Debts:Mortgage");
        Assert.Equal((100m, "EUR", "@@ 110.00 USD"), (principal.Number, principal.Commodity, principal.Price));
        Assert.Equal(-decimal.Parse((await DebtAsync(client, debt)).TrackedBalance!, CultureInfo.InvariantCulture), Assert.Single(journal.Assertions, a => a.Account == "Liabilities:Debts:Mortgage").Number);
        AssertAgree(journal, await AccountsAsync(client));
    }

    [Fact]
    public async Task A_debt_opens_at_its_earliest_recorded_balance_and_revalues_at_each_later_one()
    {
        using var client = await CreateUserClientAsync();
        var debt = (await PostAsync<IdDto>(client, "/api/debts", new { name = "Car loan", type = "loan", outstandingAmount = "800.00", asOf = "2026-05-01" })).Id;
        (await client.PutAsJsonAsync($"/api/debts/{debt}/balances/2026-03-01", new { amount = "1000.00", note = "Signed" }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        (await client.PutAsJsonAsync($"/api/debts/{debt}/balances/2026-07-01", new { amount = "850.00", note = "Fee added" }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

        var journal = await AcceptedAsync(client);

        Assert.Contains(journal.Opens, o => o.Account == "Liabilities:Debts:Car-loan" && o.Date == new DateOnly(2026, 3, 1));
        var opening = Assert.Single(journal.Transactions, t => t.Postings.Any(p => p.Account == "Liabilities:Debts:Car-loan") && t.Narration == "Opening balance");
        Assert.Equal(("Signed", (decimal?)-1000m), (opening.Meta["note"], opening.Postings.Single(p => p.Account == "Liabilities:Debts:Car-loan").Number));
        var recorded = journal.Transactions.Where(t => t.Narration == "Recorded balance").OrderBy(t => t.Date).ToList();
        Assert.Equal([new DateOnly(2026, 5, 1), new DateOnly(2026, 7, 1)], recorded.Select(t => t.Date));
        Assert.Equal([200m, -50m], recorded.Select(t => t.Postings.Single(p => p.Account == "Liabilities:Debts:Car-loan").Number));
        Assert.All(recorded, t => Assert.Contains(t.Postings, p => p.Account == "Equity:Revaluation"));
        Assert.Equal("Fee added", recorded[1].Meta["note"]);
        Assert.Equal(-850m, Assert.Single(journal.Assertions, a => a.Account == "Liabilities:Debts:Car-loan").Number);
    }

    [Fact]
    public async Task A_split_payment_linked_to_a_debt_counts_wholly_as_spending_as_in_the_app()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        var account = await CreateAccountAsync("500.00", client: client);
        var category = await CreateCategoryAsync(client: client);
        var debt = (await PostAsync<IdDto>(client, "/api/debts", new { name = "Car loan", type = "loan", outstandingAmount = "1000.00", asOf = "2026-05-01", tracksPayments = true })).Id;
        var split = await RecordTransactionAsync(client, new
        {
            accountId = account,
            type = "expense",
            amount = "100.00",
            date = "2026-05-10",
            description = "Split payment",
            lines = new[] { new { categoryId = category, amount = "60.00" }, new { categoryId = category, amount = "40.00" } },
        });
        await WithDbAsync(async db =>
        {
            db.DebtPayments.Add(new DebtPayment { UserId = user.Id, DebtId = new DebtId(debt), TransactionId = new TransactionId(split.Id) });
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });

        var journal = await AcceptedAsync(client);

        var paid = Assert.Single(journal.Transactions, t => t.Narration == "Split payment");
        Assert.DoesNotContain(paid.Postings, p => p.Account.StartsWith("Liabilities:", StringComparison.Ordinal));
        Assert.Equal("1000.00", (await DebtAsync(client, debt)).TrackedBalance);
        Assert.Equal(-1000m, Assert.Single(journal.Assertions, a => a.Account == "Liabilities:Debts:Car-loan").Number);
    }

    [Fact]
    public async Task With_investments_and_net_worth_off_the_journal_still_holds_them()
    {
        using var client = await CreateUserClientAsync();
        var broker = await CreateAccountAsync("1000.00", type: "investment", client: client);
        var symbol = NewSymbol();
        var security = await CreateSecurityAsync(client, symbol);
        await RecordInvestmentAsync(client, new { accountId = broker, securityId = security, type = "buy", date = "2026-02-02", quantity = "5", price = "100" });
        await Seed.AssetAsync(client, new DateOnly(2026, 1, 1), "Summer house");
        await Seed.DebtAsync(client, new DateOnly(2026, 1, 1), "Family loan");

        string text;
        await using (await FeatureOffAsync("investments"))
        await using (await FeatureOffAsync("netWorth"))
        {
            text = await JournalAsync(client);
        }

        var journal = JournalChecker.Accepted(text);
        Assert.Contains($"  5 {symbol} {{{{500.00 EUR}}}}\n", text, StringComparison.Ordinal);
        Assert.Contains(journal.Opens, o => o.Account == "Assets:Owned:Property:Summer-house");
        Assert.Contains(journal.Opens, o => o.Account == "Liabilities:Debts:Family-loan");
        Assert.Single(journal.Assertions, a => a.Account == "Assets:Owned:Property:Summer-house" && a.Number == 1000m);
    }

    [Fact]
    public async Task A_split_line_category_sits_under_its_parent()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: client);
        var parent = await PostAsync<IdDto>(client, "/api/categories", new { name = "Household Ūkis", type = "expense" });
        var child = await PostAsync<IdDto>(client, "/api/categories", new { name = "Švara", type = "expense", parentId = parent.Id });
        await RecordTransactionAsync(client, new
        {
            accountId = account,
            type = "expense",
            amount = "25.00",
            date = "2026-07-03",
            description = "Cleaning",
            lines = new[] { new { categoryId = child.Id, amount = "15.00" }, new { categoryId = parent.Id, amount = "10.00" } },
        });

        var journal = await AcceptedAsync(client);

        var cleaning = Assert.Single(journal.Transactions, t => t.Narration == "Cleaning");
        Assert.Contains(cleaning.Postings, p => p is { Account: "Expenses:Household-Ukis:Svara", Number: 15m });
        Assert.Contains(cleaning.Postings, p => p is { Account: "Expenses:Household-Ukis", Number: 10m });
        Assert.Equal("Švara", journal.Opens.Single(o => o.Account == "Expenses:Household-Ukis:Svara").Meta["name"]);
    }

    private static void AssertAgree(CheckedJournal journal, IReadOnlyList<AccountDto> accounts)
    {
        foreach (var account in accounts)
        {
            var name = journal.Opens.Single(o => o.Account.StartsWith("Assets:", StringComparison.Ordinal) && o.Meta.GetValueOrDefault("name") == account.Name).Account;
            Assert.StartsWith(BeancountWriter.AccountRoot(Enum.Parse<AccountType>(account.Type, ignoreCase: true)), name, StringComparison.Ordinal);
            var asserted = journal.Assertions
                .Where(a => a.Account == name && CurrencyCodes.Contains(a.Commodity))
                .ToDictionary(a => a.Commodity, a => a.Number);
            foreach (var balance in account.Balances)
            {
                Assert.Equal(decimal.Parse(balance.Amount, CultureInfo.InvariantCulture), asserted[balance.Currency.ToUpperInvariant()]);
            }

            Assert.All(
                asserted.Where(a => !account.Balances.Any(b => b.Currency.Equals(a.Key, StringComparison.OrdinalIgnoreCase))),
                a => Assert.Equal(0m, a.Value));
        }
    }

    private async Task<List<AccountDto>> AccountsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<AccountDto>>(
            $"/api/accounts?asOf={Today:yyyy-MM-dd}",
            TestContext.Current.CancellationToken))!;

    private static async Task<CheckedJournal> AcceptedAsync(HttpClient client) => JournalChecker.Accepted(await JournalAsync(client));

    private static async Task<string> JournalAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/users/me/export", TestContext.Current.CancellationToken);
        var bytes = await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken);
        Assert.True(response.StatusCode == HttpStatusCode.OK, Encoding.UTF8.GetString(bytes));
        using var archive = new ZipArchive(new MemoryStream(bytes), ZipArchiveMode.Read);
        using var reader = new StreamReader(archive.GetEntry(UserExportService.JournalEntry)!.Open(), Encoding.UTF8);
        return await reader.ReadToEndAsync(TestContext.Current.CancellationToken);
    }

    private static async Task<Guid> CreateNamedAccountAsync(HttpClient client, string name, Guid? householdId = null) =>
        (await PostAsync<IdDto>(
            client,
            "/api/accounts",
            new { name, type = "checking", startingBalance = "0.00", scope = householdId is null ? "personal" : "shared", householdId })).Id;

    private static async Task<DebtDto> DebtAsync(HttpClient client, Guid debt) =>
        (await client.GetFromJsonAsync<List<DebtDto>>("/api/debts", TestContext.Current.CancellationToken))!.Single(d => d.Id == debt);

    private sealed record DebtDto(Guid Id, string? TrackedBalance);
}
