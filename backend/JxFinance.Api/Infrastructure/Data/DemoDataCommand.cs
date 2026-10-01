using JxFinance.Common.Settings;
using JxFinance.Common.Subscriptions;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Goals;
using JxFinance.Domain.Households;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Payees;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.Data;

public static class DemoDataCommand
{
    private const int Months = 6;
    private const int UncategorizedMonths = 3;

    private static readonly Shop Maxima = new("Maxima Akropolis", 54.71062m, 25.26285m);
    private static readonly Shop Rimi = new("Rimi Gedimino", 54.68714m, 25.27668m);
    private static readonly Shop CircleK = new("Circle K Kalvarijų", 54.70631m, 25.28766m);
    private static readonly Shop Camelia = new("Camelia Vokiečių", 54.68005m, 25.28418m);

    private static readonly (string Category, string Description, decimal Amount, int Day, Shop? Place)[] MonthlyExpenses =
    [
        ("Rent", "Rent", 620.00m, 2, null),
        ("Utilities", "Electricity", 48.35m, 5, null),
        ("Utilities", "Internet", 19.99m, 7, null),
        ("Food", "Groceries", 84.20m, 3, Maxima),
        ("Food", "Groceries", 61.75m, 11, Rimi),
        ("Food", "Groceries", 93.10m, 18, Maxima),
        ("Food", "Lunch", 12.50m, 21, null),
        ("Transport", "Fuel", 55.00m, 9, CircleK),
        ("Transport", "Parking", 6.40m, 14, null),
        ("Entertainment", "Cinema", 17.00m, 16, null),
        ("Health", "Pharmacy", 23.80m, 20, Camelia),
        ("Shopping", "Clothes", 74.90m, 24, null),
    ];

    private static readonly (string Category, string Earlier, string Later, decimal Amount, int Day)[] CardPayees =
    [
        ("Food", "CAFFEINE ROASTERS VILNIUS", "CAFFEINE ROASTERS UZUPIO", 3.80m, 6),
        ("Food", "CAFFEINE ROASTERS VILNIUS", "CAFFEINE ROASTERS UZUPIO", 4.20m, 19),
        ("Transport", "BOLT.EU RIDE", "BOLT.EU RIDE", 7.40m, 13),
        ("Entertainment", "SPOTIFY P1234567", "SPOTIFY P7654321", 10.99m, 22),
    ];

    private static readonly (bool Cash, string Category, decimal Amount, int Day, string Description)[] Trip =
    [
        (false, "Transport", 38.00m, 0, "Lux Express Vilnius-Riga"),
        (false, "Other", 156.00m, 0, "Hotel Riga Old Town"),
        (true, "Food", 24.00m, 1, "Dinner in Riga"),
        (false, "Entertainment", 18.00m, 1, "Latvian National Museum"),
        (false, "Transport", 38.00m, 2, "Lux Express Riga-Vilnius"),
    ];

    public static async Task RunAsync(IServiceProvider services, string email)
    {
        using var scope = services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await users.FindByEmailAsync(email)
            ?? throw new InvalidOperationException($"No user with the email {email}. Create the account first, then seed it.");
        if (await db.Accounts.IgnoreQueryFilters().AnyAsync(a => a.UserId == user.Id))
            throw new InvalidOperationException("This user already has accounts. Demo data is only added to an empty user; run 'just db-reset' for a clean database.");

        await StarterCategories.SeedAsync(db, user.Id, CancellationToken.None);
        var categories = await db.Categories.IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(c => c.UserId == user.Id)
            .ToDictionaryAsync(c => c.Name, c => c.Id);

        var clock = scope.ServiceProvider.GetRequiredService<IClock>();
        var today = clock.Today;
        var currency = scope.ServiceProvider.GetRequiredService<IInstanceSettingsStore>().Current.ReportingCurrency;
        var firstMonth = new DateOnly(today.Year, today.Month, 1).AddMonths(1 - Months);

        var checking = NewAccount(user.Id, currency, "Main account", AccountType.Checking, 1250.00m);
        var savings = NewAccount(user.Id, currency, "Savings", AccountType.Savings, 4000.00m);
        var cash = NewAccount(user.Id, currency, "Wallet", AccountType.Cash, 150.00m);
        db.Accounts.AddRange(checking, savings, cash);

        Transaction? Spend(AccountId account, CategoryId? category, decimal amount, DateOnly date, string description) =>
            Record(db, currency, user.Id, account, category, FlowType.Expense, amount, date, description, today);

        for (var month = 0; month < Months; month++)
        {
            var start = firstMonth.AddMonths(month);
            Record(db, currency, user.Id, checking.Id, categories["Salary"], FlowType.Income, 2450.00m, start.AddDays(9), "Salary", today);
            foreach (var expense in MonthlyExpenses)
            {
                var amount = expense.Amount + month * 1.15m;
                var account = expense.Description == "Lunch" ? cash.Id : checking.Id;
                if (Spend(account, categories[expense.Category], amount, start.AddDays(expense.Day - 1), expense.Description) is { } row
                    && expense.Place is { } place)
                {
                    row.Place = place.Name;
                    row.Latitude = place.Latitude;
                    row.Longitude = place.Longitude;
                }
            }

            var categorized = month < Months - UncategorizedMonths;
            foreach (var payee in CardPayees)
            {
                Spend(
                    checking.Id,
                    categorized ? categories[payee.Category] : null,
                    payee.Amount,
                    start.AddDays(payee.Day - 1),
                    categorized ? payee.Earlier : payee.Later);
            }

            var transferDate = start.AddDays(11);
            if (transferDate <= today)
            {
                db.Transfers.Add(new Transfer
                {
                    UserId = user.Id,
                    FromAccountId = checking.Id,
                    ToAccountId = savings.Id,
                    Amount = new Money(300.00m, currency),
                    ReceivedAmount = new Money(300.00m, currency),
                    Date = transferDate,
                    Description = "Monthly saving",
                });
            }
        }

        var insuredOn = firstMonth.AddDays(14);
        Spend(checking.Id, categories["Transport"], 480.00m, insuredOn, "Car insurance")!.SpreadMonths = 12;

        var trip = new TransactionGroup { UserId = user.Id, Name = "Riga weekend" };
        db.TransactionGroups.Add(trip);
        var tripStart = firstMonth.AddMonths(1).AddDays(5);
        foreach (var row in Trip)
        {
            Spend(row.Cash ? cash.Id : checking.Id, categories[row.Category], row.Amount, tripStart.AddDays(row.Day), row.Description)!.GroupId = trip.Id;
        }

        db.PayeeNames.AddRange(
            new PayeeName { UserId = user.Id, PayeeKey = SubscriptionDescription.Normalize(CardPayees[0].Earlier), Name = "Caffeine" },
            new PayeeName { UserId = user.Id, PayeeKey = SubscriptionDescription.Normalize(CardPayees[2].Earlier), Name = "Bolt" });

        db.Budgets.AddRange(
            new Budget { UserId = user.Id, CategoryId = categories["Food"], LimitAmount = new Money(300.00m, currency) },
            new Budget { UserId = user.Id, CategoryId = categories["Transport"], LimitAmount = new Money(60.00m, currency) },
            new Budget { UserId = user.Id, CategoryId = categories["Entertainment"], LimitAmount = new Money(50.00m, currency) });
        db.Goals.AddRange(
            new Goal { UserId = user.Id, Name = "Emergency fund", TargetAmount = new Money(6000.00m, currency), CurrentAmount = new Money(4300.00m, currency) },
            new Goal { UserId = user.Id, Name = "Summer trip", TargetAmount = new Money(1800.00m, currency), CurrentAmount = new Money(450.00m, currency), TargetDate = today.AddMonths(8) },
            new Goal
            {
                UserId = user.Id,
                Name = "House deposit",
                TargetAmount = new Money(15000.00m, currency),
                Funding = GoalFunding.Account,
                FundingAccountId = savings.Id,
                FundingSharePercent = 100,
            });
        var home = new Household { Name = "Home" };
        db.Households.Add(home);
        db.HouseholdMemberships.Add(new HouseholdMembership { HouseholdId = home.Id, UserId = user.Id, Role = HouseholdRole.Owner });
        var bought = today.AddYears(-3);
        var inspected = bought.AddYears(2);
        var car = new Asset
        {
            UserId = user.Id,
            Name = "Car",
            Type = AssetType.Vehicle,
            CurrentValue = new Money(11800.00m, currency),
            AsOf = inspected,
            Depreciation = new Depreciation(bought, 16000.00m, 96, 2000.00m),
        };
        var flat = new Asset
        {
            UserId = user.Id,
            Name = "Flat",
            Type = AssetType.Property,
            CurrentValue = new Money(156000.00m, currency),
            AsOf = today,
            Scope = Scope.Shared,
            HouseholdId = home.Id,
        };
        db.Assets.AddRange(car, flat);
        db.AssetValuations.AddRange(
            new AssetValuation { AssetId = car.Id, Date = bought, Value = 16000.00m, Note = "Purchase price" },
            new AssetValuation { AssetId = car.Id, Date = inspected, Value = 11800.00m, Note = "Inspection" },
            new AssetValuation { AssetId = flat.Id, Date = today.AddYears(-2), Value = 142000.00m },
            new AssetValuation { AssetId = flat.Id, Date = today.AddYears(-1), Value = 150000.00m },
            new AssetValuation { AssetId = flat.Id, Date = today, Value = 156000.00m });
        db.Debts.Add(new Debt
        {
            UserId = user.Id,
            Name = "Car loan",
            Type = DebtType.Loan,
            OutstandingAmount = new Money(3200.00m, currency),
            InterestRate = 5.4m,
            AsOf = today,
            LoanAmount = 6000.00m,
            FirstPaymentDate = new DateOnly(today.Year, today.Month, 1).AddMonths(-23),
            TermMonths = 48,
        });

        DateOnly NextOn(int day)
        {
            var date = new DateOnly(today.Year, today.Month, day);
            return date > today ? date : date.AddMonths(1);
        }

        var rent = new RecurringBill
        {
            UserId = user.Id,
            Name = "Rent",
            Kind = RecurringBillKind.Fixed,
            Amount = 620.00m,
            CategoryId = categories["Rent"],
            AccountId = checking.Id,
            Cadence = RecurringBillCadence.Monthly,
        };
        rent.Schedule(NextOn(2));
        var electricity = new RecurringBill
        {
            UserId = user.Id,
            Name = "Electricity",
            Kind = RecurringBillKind.Variable,
            CategoryId = categories["Utilities"],
            AccountId = checking.Id,
            Cadence = RecurringBillCadence.Monthly,
        };
        electricity.Schedule(NextOn(5));
        var salary = new RecurringBill
        {
            UserId = user.Id,
            Name = "Salary",
            Shape = RecurringBillShape.Income,
            Kind = RecurringBillKind.Fixed,
            Amount = 2450.00m,
            CategoryId = categories["Salary"],
            AccountId = checking.Id,
            Cadence = RecurringBillCadence.Monthly,
        };
        salary.Schedule(NextOn(10));
        var toSavings = new RecurringBill
        {
            UserId = user.Id,
            Name = "Standing order to savings",
            Shape = RecurringBillShape.Transfer,
            Kind = RecurringBillKind.Fixed,
            Amount = 300.00m,
            AccountId = checking.Id,
            ToAccountId = savings.Id,
            Cadence = RecurringBillCadence.Monthly,
            MatchKey = SubscriptionDescription.Normalize("Monthly saving"),
        };
        toSavings.Schedule(NextOn(12));
        var insurance = new RecurringBill
        {
            UserId = user.Id,
            Name = "Car insurance",
            Kind = RecurringBillKind.Fixed,
            Amount = 480.00m,
            CategoryId = categories["Transport"],
            AccountId = checking.Id,
            Cadence = RecurringBillCadence.Yearly,
            SpreadMonths = 12,
        };
        insurance.Schedule(insuredOn.AddYears(1));
        db.RecurringBills.AddRange(rent, electricity, salary, toSavings, insurance);

        await db.SaveChangesAsync();
        var historyStart = clock.StartOfDay(firstMonth);
        foreach (var entry in db.ChangeTracker.Entries<EntityBase>())
        {
            entry.Entity.CreatedAt = historyStart;
        }

        await db.SaveChangesAsync();
        Console.WriteLine($"Seeded {Months} months of demo data for {email}.");
    }

    private static Account NewAccount(Guid userId, Currency currency, string name, AccountType type, decimal startingBalance) =>
        new() { UserId = userId, Name = name, Type = type, StartingBalance = new Money(startingBalance, currency) };

    private static Transaction? Record(
        AppDbContext db, Currency currency, Guid userId, AccountId accountId, CategoryId? categoryId, FlowType type,
        decimal amount, DateOnly date, string description, DateOnly today)
    {
        if (date > today) return null;
        var money = new Money(amount, currency);
        var transaction = new Transaction
        {
            UserId = userId,
            AccountId = accountId,
            CategoryId = categoryId,
            Type = type,
            Amount = money,
            ReportingAmount = money.Amount,
            Date = date,
            Description = description,
            Source = TransactionSource.Manual,
        };
        db.Transactions.Add(transaction);
        return transaction;
    }

    private sealed record Shop(string Name, decimal Latitude, decimal Longitude);
}
