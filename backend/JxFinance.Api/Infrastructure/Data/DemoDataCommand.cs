using JxFinance.Domain.Accounts;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Goals;
using JxFinance.Domain.NetWorth;
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

    private static readonly (string Category, string Description, decimal Amount, int Day)[] MonthlyExpenses =
    [
        ("Rent", "Rent", 620.00m, 2),
        ("Utilities", "Electricity", 48.35m, 5),
        ("Utilities", "Internet", 19.99m, 7),
        ("Food", "Groceries", 84.20m, 3),
        ("Food", "Groceries", 61.75m, 11),
        ("Food", "Groceries", 93.10m, 18),
        ("Food", "Lunch", 12.50m, 21),
        ("Transport", "Fuel", 55.00m, 9),
        ("Transport", "Parking", 6.40m, 14),
        ("Entertainment", "Cinema", 17.00m, 16),
        ("Health", "Pharmacy", 23.80m, 20),
        ("Shopping", "Clothes", 74.90m, 24),
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
        var categories = await db.Categories.IgnoreQueryFilters()
            .Where(c => c.UserId == user.Id && !c.IsDeleted)
            .ToDictionaryAsync(c => c.Name, c => c.Id);

        var today = scope.ServiceProvider.GetRequiredService<IClock>().Today;
        var firstMonth = new DateOnly(today.Year, today.Month, 1).AddMonths(1 - Months);

        var checking = NewAccount(user.Id, "Main account", AccountType.Checking, 1250.00m);
        var savings = NewAccount(user.Id, "Savings", AccountType.Savings, 4000.00m);
        var cash = NewAccount(user.Id, "Wallet", AccountType.Cash, 80.00m);
        db.Accounts.AddRange(checking, savings, cash);

        for (var month = 0; month < Months; month++)
        {
            var start = firstMonth.AddMonths(month);
            Record(db, user.Id, checking.Id, categories["Salary"], FlowType.Income, 2450.00m, start.AddDays(9), "Salary", today);
            foreach (var expense in MonthlyExpenses)
            {
                var amount = expense.Amount + month * 1.15m;
                var account = expense.Description == "Lunch" ? cash.Id : checking.Id;
                Record(db, user.Id, account, categories[expense.Category], FlowType.Expense, amount, start.AddDays(expense.Day - 1), expense.Description, today);
            }

            var transferDate = start.AddDays(11);
            if (transferDate <= today)
            {
                db.Transfers.Add(new Transfer
                {
                    UserId = user.Id,
                    FromAccountId = checking.Id,
                    ToAccountId = savings.Id,
                    Amount = new Money(300.00m),
                    ReceivedAmount = new Money(300.00m),
                    Date = transferDate,
                    Description = "Monthly saving",
                });
            }
        }

        db.Budgets.AddRange(
            new Budget { UserId = user.Id, CategoryId = categories["Food"], LimitAmount = new Money(300.00m) },
            new Budget { UserId = user.Id, CategoryId = categories["Transport"], LimitAmount = new Money(60.00m) },
            new Budget { UserId = user.Id, CategoryId = categories["Entertainment"], LimitAmount = new Money(50.00m) });
        db.Goals.AddRange(
            new Goal { UserId = user.Id, Name = "Emergency fund", TargetAmount = new Money(6000.00m), CurrentAmount = new Money(4300.00m) },
            new Goal { UserId = user.Id, Name = "Summer trip", TargetAmount = new Money(1800.00m), CurrentAmount = new Money(450.00m), TargetDate = today.AddMonths(8) });
        db.Assets.Add(new Asset { UserId = user.Id, Name = "Car", Type = AssetType.Vehicle, CurrentValue = new Money(8500.00m), AsOf = today });
        db.Debts.Add(new Debt { UserId = user.Id, Name = "Car loan", Type = DebtType.Loan, OutstandingAmount = new Money(3200.00m), InterestRate = 5.4m, AsOf = today });

        var rent = new RecurringBill
        {
            UserId = user.Id,
            Name = "Rent",
            Kind = RecurringBillKind.Fixed,
            Amount = new Money(620.00m),
            CategoryId = categories["Rent"],
            AccountId = checking.Id,
            Cadence = RecurringBillCadence.Monthly,
        };
        rent.Schedule(new DateOnly(today.Year, today.Month, 2).AddMonths(1));
        var electricity = new RecurringBill
        {
            UserId = user.Id,
            Name = "Electricity",
            Kind = RecurringBillKind.Variable,
            CategoryId = categories["Utilities"],
            AccountId = checking.Id,
            Cadence = RecurringBillCadence.Monthly,
        };
        electricity.Schedule(today.AddDays(2));
        db.RecurringBills.AddRange(rent, electricity);

        await db.SaveChangesAsync();
        Console.WriteLine($"Seeded {Months} months of demo data for {email}.");
    }

    private static Account NewAccount(Guid userId, string name, AccountType type, decimal startingBalance) =>
        new() { UserId = userId, Name = name, Type = type, StartingBalance = new Money(startingBalance) };

    private static void Record(
        AppDbContext db, Guid userId, AccountId accountId, CategoryId categoryId, FlowType type,
        decimal amount, DateOnly date, string description, DateOnly today)
    {
        if (date > today) return;
        var money = new Money(amount);
        db.Transactions.Add(new Transaction
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
        });
    }
}
