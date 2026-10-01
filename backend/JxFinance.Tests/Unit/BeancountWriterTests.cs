using JxFinance.Common.Journal;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.NetWorth;
using JxFinance.Tests.Support.Journal;

namespace JxFinance.Tests.Unit;

public sealed class BeancountWriterTests
{
    private static readonly DateOnly Today = new(2026, 9, 30);
    private static readonly DateOnly Created = new(2026, 1, 10);
    private static readonly Guid Main = Id(1);
    private static readonly Guid Savings = Id(2);
    private static readonly Guid Dollars = Id(3);
    private static readonly Guid Broker = Id(4);
    private static readonly Guid Partner = Id(5);
    private static readonly Guid Home = Id(10);
    private static readonly Guid Food = Id(11);
    private static readonly Guid Salary = Id(12);
    private static readonly Guid Loans = Id(13);
    private static readonly Guid Apple = Id(20);
    private static readonly Guid Car = Id(30);
    private static readonly Guid Loan = Id(40);

    private static readonly JournalBook Empty = new(
        "Test Member",
        Currency.Eur,
        Today,
        [],
        [],
        [
            new JournalCategory(Home, "Home", FlowType.Expense, null),
            new JournalCategory(Food, "Food", FlowType.Expense, Home),
            new JournalCategory(Salary, "Salary", FlowType.Income, null),
            new JournalCategory(Loans, "Loans", FlowType.Expense, null),
        ],
        [],
        [],
        [],
        [new JournalSecurity(Apple, "aapl", Currency.Usd, 170m, new DateOnly(2026, 9, 29), true)],
        [],
        [],
        [],
        []);

    public static TheoryData<string> Mapping() =>
    [
        "account",
        "header",
        "expense",
        "refund",
        "income",
        "transfer",
        "conversion",
        "buy and sell",
        "sell across two lots",
        "investment income and costs",
        "stock split",
        "oversold account",
        "asset",
        "debt",
        "debt payment in another currency",
        "assertions",
    ];

    [Theory]
    [MemberData(nameof(Mapping))]
    public void Every_mapping_writes_a_journal_the_checker_accepts(string mapping)
    {
        var (book, expected) = Case(mapping);

        var text = BeancountWriter.Write(book);

        JournalChecker.Accepted(text);
        Assert.All(expected, fragment => Assert.Contains(fragment, text, StringComparison.Ordinal));
    }

    [Fact]
    public void Quotes_backslashes_and_line_breaks_are_escaped()
    {
        var book = WithMain(0m) with
        {
            Member = "Jonas \"J\" Jonaitis",
            Transactions = [Expense(Id(100), 5m, "Line one\r\nline \"two\"\nC:\\path", note: "Paid \\ \"cash\"\rtoo")],
            Balances = [Balance(Main, -5m)],
        };

        var text = BeancountWriter.Write(book);

        var journal = JournalChecker.Accepted(text);
        Assert.Contains("option \"title\" \"Jx Finance – Jonas \\\"J\\\" Jonaitis\"", text, StringComparison.Ordinal);
        Assert.Contains("* \"Line one line \\\"two\\\" C:\\\\path\"", text, StringComparison.Ordinal);
        var transaction = Assert.Single(journal.Transactions, t => t.Meta.ContainsKey("jx-id"));
        Assert.Equal("Line one line \"two\" C:\\path", transaction.Narration);
        Assert.Equal("Paid \\ \"cash\" too", transaction.Meta["note"]);
    }

    [Fact]
    public void A_payee_name_is_the_payee_and_a_note_is_metadata()
    {
        var book = WithMain(0m) with
        {
            Transactions =
            [
                Expense(Id(100), 5m, "MAXIMA LT-123 VILNIUS", payee: "Maxima", note: "Milk and bread"),
                Expense(Id(101), 6m, "Kiosk"),
            ],
            Balances = [Balance(Main, -11m)],
        };

        var text = BeancountWriter.Write(book);

        var journal = JournalChecker.Accepted(text);
        Assert.Contains("2026-02-01 * \"Maxima\" \"MAXIMA LT-123 VILNIUS\"\n  jx-id: ", text, StringComparison.Ordinal);
        Assert.Contains("2026-02-01 * \"Kiosk\"\n", text, StringComparison.Ordinal);
        var named = Assert.Single(journal.Transactions, t => t.Payee == "Maxima");
        Assert.Equal("Milk and bread", named.Meta["note"]);
        Assert.Equal(Id(100).ToString(), named.Meta["jx-id"]);
        Assert.DoesNotContain("note", Assert.Single(journal.Transactions, t => t.Narration == "Kiosk").Meta.Keys);
    }

    [Fact]
    public void The_checker_refuses_a_journal_whose_assertion_differs()
    {
        var book = WithMain(100m) with { Balances = [Balance(Main, 99m)] };

        var journal = JournalChecker.Check(BeancountWriter.Write(book));

        Assert.Contains(journal.Errors, e => e.Contains("Balance failed for Assets:Bank:Main", StringComparison.Ordinal));
    }

    private static (JournalBook Book, string[] Expected) Case(string mapping) => mapping switch
    {
        "account" => (
            WithMain(100m) with
            {
                Accounts =
                [
                    new JournalAccount(Main, "Main", AccountType.Checking, new Money(100m, Currency.Eur), Created),
                    new JournalAccount(Savings, "Šeimos taupymas", AccountType.Savings, new Money(0m, Currency.Eur), Created),
                ],
                Transactions = [Expense(Id(100), 5m, "Before the account was created", new DateOnly(2026, 1, 5))],
                Balances = [Balance(Main, 95m), Balance(Savings, 0m)],
            },
            [
                "2026-01-05 open Assets:Bank:Main\n  name: \"Main\"\n",
                "2026-01-05 * \"Opening balance\"\n  Assets:Bank:Main  100.00 EUR\n  Equity:Opening-Balances  -100.00 EUR\n",
                "2026-01-10 open Assets:Savings:Seimos-taupymas\n  name: \"Šeimos taupymas\"\n",
                "2026-01-05 open Equity:Opening-Balances\n",
                "2026-10-01 balance Assets:Savings:Seimos-taupymas  0.00 EUR\n",
            ]),
        "header" => (
            WithMain(0m) with { Balances = [Balance(Main, 0m)] },
            [
                "option \"title\" \"Jx Finance – Test Member\"\n",
                "option \"operating_currency\" \"EUR\"\n",
                "option \"booking_method\" \"FIFO\"\n",
            ]),
        "expense" => (
            WithMain(100m) with
            {
                Transactions =
                [
                    Expense(Id(100), 30m, "Groceries") with { Lines = [new JournalLine(Food, 20m), new JournalLine(null, 10m)] },
                    Expense(Id(101), 7.5m, "Rent share", category: Home),
                ],
                Balances = [Balance(Main, 62.5m)],
            },
            [
                "  Assets:Bank:Main  -30.00 EUR\n  Expenses:Home:Food  20.00 EUR\n  Expenses:Uncategorized  10.00 EUR\n",
                "  Assets:Bank:Main  -7.50 EUR\n  Expenses:Home  7.50 EUR\n",
                "open Expenses:Home:Food\n  name: \"Food\"\n",
            ]),
        "refund" => (
            WithMain(100m) with
            {
                Transactions = [Expense(Id(100), -12m, "Returned shoes", category: Food)],
                Balances = [Balance(Main, 112m)],
            },
            ["  Assets:Bank:Main  12.00 EUR\n  Expenses:Home:Food  -12.00 EUR\n"]),
        "income" => (
            WithMain(0m) with
            {
                Transactions =
                [
                    new JournalTransaction(Id(100), Main, new DateOnly(2026, 2, 10), FlowType.Income, new Money(2450m, Currency.Eur), 2450m, "Salary", [new JournalLine(Salary, 2450m)]),
                    new JournalTransaction(Id(101), Main, new DateOnly(2026, 2, 11), FlowType.Income, new Money(20m, Currency.Eur), 20m, "Gift", [new JournalLine(null, 20m)]),
                ],
                Balances = [Balance(Main, 2470m)],
            },
            [
                "  Assets:Bank:Main  2450.00 EUR\n  Income:Salary  -2450.00 EUR\n",
                "  Assets:Bank:Main  20.00 EUR\n  Income:Uncategorized  -20.00 EUR\n",
            ]),
        "transfer" => (
            WithMain(500m) with
            {
                Accounts =
                [
                    new JournalAccount(Main, "Main", AccountType.Checking, new Money(500m, Currency.Eur), Created),
                    new JournalAccount(Savings, "Savings", AccountType.Savings, new Money(0m, Currency.Eur), Created),
                    new JournalAccount(Dollars, "Dollars", AccountType.Other, new Money(0m, Currency.Usd), Created),
                ],
                OutsideAccounts = [new JournalOutsideAccount(Partner, "Partner's card")],
                Transfers =
                [
                    new JournalTransfer(Id(100), Main, Savings, new DateOnly(2026, 2, 1), new Money(300m, Currency.Eur), new Money(300m, Currency.Eur), "Saving"),
                    new JournalTransfer(Id(101), Main, Dollars, new DateOnly(2026, 2, 2), new Money(100m, Currency.Eur), new Money(110m, Currency.Usd), "Dollars"),
                    new JournalTransfer(Id(102), Main, Partner, new DateOnly(2026, 2, 3), new Money(30m, Currency.Eur), new Money(30m, Currency.Eur), "To partner"),
                    new JournalTransfer(Id(103), Partner, Savings, new DateOnly(2026, 2, 4), new Money(10m, Currency.Eur), new Money(10m, Currency.Eur), "From partner"),
                ],
                Balances = [Balance(Main, 70m), Balance(Savings, 310m), Balance(Dollars, 110m, Currency.Usd)],
            },
            [
                "  Assets:Bank:Main  -300.00 EUR\n  Assets:Savings:Savings  300.00 EUR\n",
                "  Assets:Bank:Main  -100.00 EUR\n  Assets:Other:Dollars  110.00 USD @@ 100.00 EUR\n",
                "  Assets:Bank:Main  -30.00 EUR\n  Equity:Outside-Accounts:Partner-s-card  30.00 EUR\n",
                "  Equity:Outside-Accounts:Partner-s-card  -10.00 EUR\n  Assets:Savings:Savings  10.00 EUR\n",
            ]),
        "conversion" => (
            WithMain(200m) with
            {
                Conversions = [new JournalConversion(Id(100), Main, new DateOnly(2026, 3, 1), new Money(100m, Currency.Eur), new Money(108.5m, Currency.Usd), "Exchange")],
                Transactions = [Expense(Id(101), 1.5m, "Exchange fee", new DateOnly(2026, 3, 1))],
                Balances = [Balance(Main, 98.5m), Balance(Main, 108.5m, Currency.Usd)],
            },
            ["  Assets:Bank:Main  -100.00 EUR\n  Assets:Bank:Main  108.50 USD @@ 100.00 EUR\n"]),
        "buy and sell" => (
            Investing(
                [
                    Investment(Id(100), InvestmentTransactionType.Buy, new DateOnly(2026, 2, 2), 10m, 150m, -1505m),
                    Investment(Id(101), InvestmentTransactionType.Sell, new DateOnly(2026, 5, 4), 4m, 160m, 638.5m) with { SoldQuantity = 4m, SoldCost = 602m },
                ],
                [Balance(Broker, 1133.5m, Currency.Usd), Holding(6m)]),
            [
                "  Assets:Investments:Broker  10 AAPL {{1505.00 USD}}\n  Assets:Investments:Broker  -1505.00 USD\n",
                "  Assets:Investments:Broker  -4 AAPL {} @ 160 USD\n  Assets:Investments:Broker  638.50 USD\n  Income:Investments:Gains\n",
                "2026-10-01 balance Assets:Investments:Broker  6 AAPL\n",
                "2026-09-29 price AAPL 170 USD\n",
            ]),
        "sell across two lots" => (
            Investing(
                [
                    Investment(Id(100), InvestmentTransactionType.Buy, new DateOnly(2026, 2, 2), 2m, 100m, -200m),
                    Investment(Id(101), InvestmentTransactionType.Buy, new DateOnly(2026, 3, 2), 3m, 150m, -450m),
                    Investment(Id(102), InvestmentTransactionType.Sell, new DateOnly(2026, 4, 2), 3m, 200m, 600m) with { SoldQuantity = 3m, SoldCost = 350m },
                ],
                [Balance(Broker, 1950m, Currency.Usd), Holding(2m)]),
            ["  Assets:Investments:Broker  -3 AAPL {} @ 200 USD\n"]),
        "investment income and costs" => (
            Investing(
                [
                    Investment(Id(100), InvestmentTransactionType.Dividend, new DateOnly(2026, 2, 2), 0m, 0m, 12m),
                    Investment(Id(101), InvestmentTransactionType.Dividend, new DateOnly(2026, 2, 3), 0m, 0m, -2m),
                    Investment(Id(102), InvestmentTransactionType.Interest, new DateOnly(2026, 2, 4), 0m, 0m, 3m),
                    Investment(Id(103), InvestmentTransactionType.WithholdingTax, new DateOnly(2026, 2, 5), 0m, 0m, -1.8m),
                    Investment(Id(104), InvestmentTransactionType.Fee, new DateOnly(2026, 2, 6), 0m, 0m, -4m),
                ],
                [Balance(Broker, 2007.2m, Currency.Usd)]),
            [
                "  Assets:Investments:Broker  12.00 USD\n  Income:Investments:Dividends  -12.00 USD\n",
                "  Assets:Investments:Broker  -2.00 USD\n  Income:Investments:Dividends  2.00 USD\n",
                "  Assets:Investments:Broker  3.00 USD\n  Income:Investments:Interest  -3.00 USD\n",
                "  Assets:Investments:Broker  -1.80 USD\n  Expenses:Investments:Taxes  1.80 USD\n",
                "  Assets:Investments:Broker  -4.00 USD\n  Expenses:Investments:Fees  4.00 USD\n",
            ]),
        "stock split" => (
            Investing(
                [
                    Investment(Id(100), InvestmentTransactionType.Buy, new DateOnly(2026, 2, 2), 3m, 100m, -301m),
                    Investment(Id(101), InvestmentTransactionType.Buy, new DateOnly(2026, 3, 2), 2m, 110m, -220m),
                    Investment(Id(102), InvestmentTransactionType.Sell, new DateOnly(2026, 3, 3), 1m, 120m, 120m) with { SoldQuantity = 1m, SoldCost = 301m / 3m },
                    Investment(Id(103), InvestmentTransactionType.Split, new DateOnly(2026, 4, 1), 4m, 0m, 0m) with
                    {
                        OpenLots = [Lot(new DateOnly(2026, 2, 2), 2m, 301m - (301m / 3m)), Lot(new DateOnly(2026, 3, 2), 2m, 220m)],
                    },
                    Investment(Id(104), InvestmentTransactionType.Sell, new DateOnly(2026, 5, 1), 10m, 40m, 400m) with { SoldQuantity = 10m, SoldCost = (301m - (301m / 3m)) + (220m / 4m) },
                ],
                [Balance(Broker, 1999m, Currency.Usd), Holding(6m)]),
            [
                "  jx-split-ratio: 4\n  Assets:Investments:Broker  -4 AAPL {}\n  Assets:Investments:Broker  8 AAPL {{200.",
                " USD, 2026-02-02}}\n  Assets:Investments:Broker  8 AAPL {{220.00 USD, 2026-03-02}}\n",
            ]),
        "oversold account" => (
            Investing(
                [
                    Investment(Id(100), InvestmentTransactionType.Buy, new DateOnly(2026, 2, 2), 5m, 100m, -500m),
                    Investment(Id(101), InvestmentTransactionType.Sell, new DateOnly(2026, 3, 2), 8m, 120m, 960m) with { SoldQuantity = 5m, SoldCost = 500m },
                    Investment(Id(102), InvestmentTransactionType.Buy, new DateOnly(2026, 4, 2), 2m, 100m, -200m),
                    Investment(Id(103), InvestmentTransactionType.Split, new DateOnly(2026, 5, 2), 2m, 0m, 0m) with { OpenLots = [Lot(new DateOnly(2026, 4, 2), 2m, 200m)] },
                    Investment(Id(104), InvestmentTransactionType.Sell, new DateOnly(2026, 6, 2), 1m, 60m, 60m) with { SoldQuantity = 1m, SoldCost = 50m },
                ],
                [Balance(Broker, 2320m, Currency.Usd), Holding(3m)],
                oversold: Id(101)),
            [
                "open Assets:Investments:Broker \"NONE\"\n  name: \"Broker\"\n  jx-oversold-sale: \"",
                "  jx-sold-quantity: 8\n",
                "  Assets:Investments:Broker  -5 AAPL {{500.00 USD}} @ 120 USD\n  Assets:Investments:Broker  960.00 USD\n  Income:Investments:Gains\n",
                "  Assets:Investments:Broker  -2 AAPL {{200.00 USD}}\n  Assets:Investments:Broker  4 AAPL {{200.00 USD, 2026-04-02}}\n",
            ]),
        "asset" => (
            Empty with
            {
                Assets =
                [
                    new JournalAsset(
                        Car,
                        "Car",
                        AssetType.Vehicle,
                        Currency.Eur,
                        [new JournalValuation(new DateOnly(2023, 9, 30), 16000m, "Purchase price"), new JournalValuation(new DateOnly(2025, 9, 30), 11800m, null)],
                        10000m),
                ],
                Balances = [Balance(Car, 10000m)],
            },
            [
                "2023-09-30 open Assets:Owned:Vehicle:Car\n",
                "2023-09-30 * \"Opening balance\"\n  note: \"Purchase price\"\n  Assets:Owned:Vehicle:Car  16000.00 EUR\n  Equity:Opening-Balances  -16000.00 EUR\n",
                "2025-09-30 * \"Valuation\"\n  Assets:Owned:Vehicle:Car  -4200.00 EUR\n  Equity:Revaluation  4200.00 EUR\n",
                "2026-09-30 * \"Depreciation\"\n  Assets:Owned:Vehicle:Car  -1800.00 EUR\n  Equity:Revaluation  1800.00 EUR\n",
            ]),
        "debt" => (
            WithMain(1000m) with
            {
                Debts = [new JournalDebt(Loan, "Car loan", Currency.Eur, [new JournalValuation(new DateOnly(2026, 1, 1), 1000m, null)])],
                Transactions =
                [
                    Expense(Id(100), 150m, "Loan payment", new DateOnly(2026, 1, 1), Loans),
                    Expense(Id(101), 150m, "Loan payment", new DateOnly(2026, 2, 1), Loans) with { DebtPayment = new JournalDebtPayment(Loan, new Money(140m, Currency.Eur), 140m) },
                    Expense(Id(102), 100m, "Extra payment", new DateOnly(2026, 3, 1), Loans) with { DebtPayment = new JournalDebtPayment(Loan, new Money(100m, Currency.Eur), 100m) },
                ],
                Balances = [Balance(Main, 600m), Balance(Loan, -760m)],
            },
            [
                "2026-01-01 open Liabilities:Debts:Car-loan\n  name: \"Car loan\"\n",
                "  Liabilities:Debts:Car-loan  -1000.00 EUR\n  Equity:Opening-Balances  1000.00 EUR\n",
                "  jx-category-amount: 150.00 EUR\n  Assets:Bank:Main  -150.00 EUR\n  Liabilities:Debts:Car-loan  140.00 EUR\n  Expenses:Loans  10.00 EUR\n",
                "  jx-category-amount: 100.00 EUR\n  Assets:Bank:Main  -100.00 EUR\n  Liabilities:Debts:Car-loan  100.00 EUR\n\n",
                "2026-01-01 * \"Loan payment\"\n  jx-id: \"00000000-0000-0000-0000-000000000100\"\n  Assets:Bank:Main  -150.00 EUR\n  Expenses:Loans  150.00 EUR\n",
            ]),
        "debt payment in another currency" => (
            WithMain(1000m) with
            {
                Debts = [new JournalDebt(Loan, "Dollar loan", Currency.Usd, [new JournalValuation(new DateOnly(2026, 1, 1), 1000m, null)])],
                Transactions = [Expense(Id(100), 100m, "Loan payment", new DateOnly(2026, 2, 1), Loans) with { DebtPayment = new JournalDebtPayment(Loan, new Money(104.5m, Currency.Usd), 95m) }],
                Balances = [Balance(Main, 900m), Balance(Loan, -895.5m, Currency.Usd)],
            },
            ["  Assets:Bank:Main  -100.00 EUR\n  Liabilities:Debts:Dollar-loan  104.50 USD @@ 95.00 EUR\n  Expenses:Loans  5.00 EUR\n"]),
        "assertions" => (
            WithMain(100m) with
            {
                Transactions =
                [
                    Expense(Id(100), 10m, "Today", Today),
                    Expense(Id(101), 20m, "Tomorrow", Today.AddDays(1)),
                    Expense(Id(102), 30m, "Next month", new DateOnly(2026, 10, 15)),
                    new JournalTransaction(Id(103), Main, new DateOnly(2026, 3, 1), FlowType.Expense, new Money(10m, Currency.Usd), 9.2m, "Dollars", [new JournalLine(null, 10m)]),
                ],
                Balances = [Balance(Main, 90m), Balance(Main, -10m, Currency.Usd)],
            },
            [
                "2026-10-01 balance Assets:Bank:Main  90.00 EUR\n\n2026-10-01 balance Assets:Bank:Main  -10.00 USD\n\n2026-10-01 * \"Tomorrow\"",
                "2026-03-01 price USD 0.92 EUR\n",
            ]),
        _ => throw new ArgumentOutOfRangeException(nameof(mapping), mapping, null),
    };

    private static Guid Id(int n) => Guid.Parse($"00000000-0000-0000-0000-{n:D12}");

    private static JournalBook WithMain(decimal starting) =>
        Empty with { Accounts = [new JournalAccount(Main, "Main", AccountType.Checking, new Money(starting, Currency.Eur), Created)] };

    private static JournalBook Investing(IReadOnlyList<JournalInvestment> entries, IReadOnlyList<JournalBalance> balances, Guid? oversold = null) =>
        Empty with
        {
            Accounts = [new JournalAccount(Broker, "Broker", AccountType.Investment, new Money(2000m, Currency.Usd), Created, oversold)],
            Investments = entries,
            Balances = balances,
        };

    private static JournalTransaction Expense(
        Guid id,
        decimal amount,
        string description,
        DateOnly? date = null,
        Guid? category = null,
        string? payee = null,
        string? note = null) =>
        new(id, Main, date ?? new DateOnly(2026, 2, 1), FlowType.Expense, new Money(amount, Currency.Eur), amount, description, [new JournalLine(category, amount)], payee, note);

    private static JournalInvestment Investment(Guid id, InvestmentTransactionType type, DateOnly date, decimal quantity, decimal price, decimal cash) =>
        new(id, Broker, date, type, type is InvestmentTransactionType.Interest or InvestmentTransactionType.Fee ? null : Apple, quantity, price, new Money(cash, Currency.Usd), type.ToString());

    private static Position.Lot Lot(DateOnly acquired, decimal quantity, decimal cost) => new(acquired, quantity, cost, cost);

    private static JournalBalance Balance(Guid of, decimal amount, Currency currency = Currency.Eur) => new(of, amount, currency);

    private static JournalBalance Holding(decimal quantity) => new(Broker, quantity, null, Apple);
}
