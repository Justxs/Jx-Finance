using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JxFinance.Infrastructure.Data;

public static class DevDataSeeder
{
    private static readonly (string Name, FlowType Type, string Icon)[] StarterCategories =
    [
        ("Salary", FlowType.Income, "banknote"),
        ("Other income", FlowType.Income, "coins"),
        ("Food", FlowType.Expense, "utensils"),
        ("Rent", FlowType.Expense, "home"),
        ("Utilities", FlowType.Expense, "lightbulb"),
        ("Transport", FlowType.Expense, "car"),
        ("Entertainment", FlowType.Expense, "clapperboard"),
        ("Health", FlowType.Expense, "heart-pulse"),
        ("Shopping", FlowType.Expense, "shopping-bag"),
        ("Other", FlowType.Expense, "shapes"),
    ];

    public static async Task SeedUserCategoriesAsync(AppDbContext db, Guid userId, CancellationToken cancellationToken)
    {
        if (await db.Categories.IgnoreQueryFilters().AnyAsync(c => c.UserId == userId, cancellationToken)) return;
        db.Categories.AddRange(StarterCategories.Select(starter => new Category
        {
            UserId = userId, Name = starter.Name, Type = starter.Type, Icon = starter.Icon, IsDefault = true,
        }));
        await db.SaveChangesAsync(cancellationToken);
    }

    public static async Task SeedAsync(
        AppDbContext db,
        UserManager<AppUser> userManager,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (!await db.Users.AnyAsync(cancellationToken))
        {
            var devUser = new AppUser
            {
                Id = DevCurrentUser.DevUserId,
                UserName = "dev@localhost",
                Email = "dev@localhost",
                EmailConfirmed = true,
            };

            var created = await userManager.CreateAsync(devUser);
            if (!created.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to seed the dev user: {string.Join("; ", created.Errors.Select(e => e.Description))}");
            }

            logger.LogInformation("Seeded the dev user {UserId}.", devUser.Id);
        }

        if (!await db.Categories.IgnoreQueryFilters().AnyAsync(cancellationToken))
        {
            db.Categories.AddRange(StarterCategories.Select(starter => new Category
            {
                Name = starter.Name,
                Type = starter.Type,
                Icon = starter.Icon,
                IsDefault = true,
                UserId = DevCurrentUser.DevUserId,
            }));

            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Seeded {Count} starter categories.", StarterCategories.Length);
        }
    }
}
