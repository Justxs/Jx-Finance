using System.Linq.Expressions;
using System.Reflection;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Goals;
using JxFinance.Domain.Households;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUser currentUser)
    : IdentityDbContext<AppUser, AppRole, Guid>(options)
{
    private Guid CurrentUserId => currentUser.Id;

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<TransactionLine> TransactionLines => Set<TransactionLine>();
    public DbSet<Transfer> Transfers => Set<Transfer>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<Debt> Debts => Set<Debt>();
    public DbSet<RecurringBill> RecurringBills => Set<RecurringBill>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NetWorthSnapshot> NetWorthSnapshots => Set<NetWorthSnapshot>();
    public DbSet<Household> Households => Set<Household>();
    public DbSet<HouseholdMembership> HouseholdMemberships => Set<HouseholdMembership>();

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyEntityRules();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        ApplyEntityRules();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        ConfigureLedger(builder);
        ApplyQueryFilters(builder);
    }

    private static void ConfigureLedger(ModelBuilder builder)
    {
        builder.Entity<AppUser>(user =>
        {
            user.Property(u => u.DisplayName).HasMaxLength(100);
        });

        builder.Entity<Account>(account =>
        {
            account.Property(a => a.Id).HasConversion(id => id.Value, value => new AccountId(value));
            account.Property(a => a.Name).HasMaxLength(100);
            account.Property(a => a.Description).HasMaxLength(500);
            account.Property(a => a.Iban).HasMaxLength(34);
            account.Property(a => a.StartingBalance)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            account.Property(a => a.HouseholdId).HasConversion(
                id => id.HasValue ? id.Value.Value : (Guid?)null,
                value => value.HasValue ? new HouseholdId(value.Value) : (HouseholdId?)null);
            account.HasIndex(a => a.UserId);
            account.HasIndex(a => a.HouseholdId);
            account.HasOne<AppUser>().WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Restrict);
            account.HasOne<Household>().WithMany().HasForeignKey(a => a.HouseholdId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Category>(category =>
        {
            category.Property(c => c.Id).HasConversion(id => id.Value, value => new CategoryId(value));
            category.Property(c => c.Name).HasMaxLength(100);
            category.Property(c => c.Icon).HasMaxLength(50);
            category.Property(c => c.HouseholdId).HasConversion(
                id => id.HasValue ? id.Value.Value : (Guid?)null,
                value => value.HasValue ? new HouseholdId(value.Value) : (HouseholdId?)null);
            category.HasIndex(c => c.UserId);
            category.HasIndex(c => c.HouseholdId);
            category.HasOne<AppUser>().WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Restrict);
            category.HasOne<Household>().WithMany().HasForeignKey(c => c.HouseholdId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Transaction>(transaction =>
        {
            transaction.Property(t => t.Id).HasConversion(id => id.Value, value => new TransactionId(value));
            transaction.Property(t => t.AccountId).HasConversion(id => id.Value, value => new AccountId(value));
            transaction.Property(t => t.CategoryId).HasConversion(
                id => id.HasValue ? id.Value.Value : (Guid?)null,
                value => value.HasValue ? new CategoryId(value.Value) : (CategoryId?)null);
            transaction.Property(t => t.Amount)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            transaction.Property(t => t.Description).HasMaxLength(500);
            transaction.Property(t => t.ImportRef).HasMaxLength(64);
            transaction.HasIndex(t => new { t.UserId, t.Date });
            transaction.HasIndex(t => t.AccountId);
            transaction.HasIndex(t => t.CategoryId);
            transaction.HasIndex(t => new { t.AccountId, t.ImportRef })
                .IsUnique()
                .HasFilter("\"ImportRef\" IS NOT NULL");
            transaction.HasOne<AppUser>().WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Restrict);
            transaction.HasOne<Domain.Accounts.Account>().WithMany().HasForeignKey(t => t.AccountId).OnDelete(DeleteBehavior.Restrict);
            transaction.HasOne<Domain.Categories.Category>().WithMany().HasForeignKey(t => t.CategoryId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<TransactionLine>(line =>
        {
            line.Property(l => l.TransactionId).HasConversion(id => id.Value, value => new TransactionId(value));
            line.Property(l => l.CategoryId).HasConversion(
                id => id.HasValue ? id.Value.Value : (Guid?)null,
                value => value.HasValue ? new CategoryId(value.Value) : (CategoryId?)null);
            line.Property(l => l.Amount)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            line.Property(l => l.Description).HasMaxLength(500);
            line.HasIndex(l => l.TransactionId);
            line.HasOne<Transaction>().WithMany().HasForeignKey(l => l.TransactionId).OnDelete(DeleteBehavior.Cascade);
            line.HasOne<Domain.Categories.Category>().WithMany().HasForeignKey(l => l.CategoryId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Transfer>(transfer =>
        {
            transfer.Property(t => t.Id).HasConversion(id => id.Value, value => new TransferId(value));
            transfer.Property(t => t.FromAccountId).HasConversion(id => id.Value, value => new AccountId(value));
            transfer.Property(t => t.ToAccountId).HasConversion(id => id.Value, value => new AccountId(value));
            transfer.Property(t => t.Amount)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            transfer.Property(t => t.Description).HasMaxLength(500);
            transfer.HasIndex(t => new { t.UserId, t.Date });
            transfer.HasOne<AppUser>().WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Restrict);
            transfer.HasOne<Domain.Accounts.Account>().WithMany().HasForeignKey(t => t.FromAccountId).OnDelete(DeleteBehavior.Restrict);
            transfer.HasOne<Domain.Accounts.Account>().WithMany().HasForeignKey(t => t.ToAccountId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Budget>(budget =>
        {
            budget.Property(b => b.Id).HasConversion(id => id.Value, value => new BudgetId(value));
            budget.Property(b => b.CategoryId).HasConversion(id => id.Value, value => new CategoryId(value));
            budget.Property(b => b.LimitAmount)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            budget.HasIndex(b => b.UserId);
            budget.HasOne<AppUser>().WithMany().HasForeignKey(b => b.UserId).OnDelete(DeleteBehavior.Restrict);
            budget.HasOne<Domain.Categories.Category>().WithMany().HasForeignKey(b => b.CategoryId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Goal>(goal =>
        {
            goal.Property(g => g.Id).HasConversion(id => id.Value, value => new GoalId(value));
            goal.Property(g => g.Name).HasMaxLength(100);
            goal.Property(g => g.TargetAmount)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            goal.Property(g => g.CurrentAmount)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            goal.HasIndex(g => g.UserId);
            goal.HasOne<AppUser>().WithMany().HasForeignKey(g => g.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Asset>(asset =>
        {
            asset.Property(a => a.Id).HasConversion(id => id.Value, value => new AssetId(value));
            asset.Property(a => a.Name).HasMaxLength(100);
            asset.Property(a => a.CurrentValue)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            asset.HasIndex(a => a.UserId);
            asset.HasOne<AppUser>().WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Debt>(debt =>
        {
            debt.Property(d => d.Id).HasConversion(id => id.Value, value => new DebtId(value));
            debt.Property(d => d.Name).HasMaxLength(100);
            debt.Property(d => d.OutstandingAmount)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            debt.Property(d => d.InterestRate).HasPrecision(5, 2);
            debt.HasIndex(d => d.UserId);
            debt.HasOne<AppUser>().WithMany().HasForeignKey(d => d.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<NetWorthSnapshot>(snapshot =>
        {
            snapshot.Property(s => s.Id).HasConversion(id => id.Value, value => new NetWorthSnapshotId(value));
            snapshot.Property(s => s.Accounts)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            snapshot.Property(s => s.Assets)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            snapshot.Property(s => s.Debts)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            snapshot.Property(s => s.NetWorthValue)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            snapshot.HasIndex(s => new { s.UserId, s.Date });
            snapshot.HasOne<AppUser>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<RecurringBill>(bill =>
        {
            bill.Property(b => b.Id).HasConversion(id => id.Value, value => new RecurringBillId(value));
            bill.Property(b => b.Name).HasMaxLength(100);
            bill.Property(b => b.Amount)
                .HasConversion(
                    money => money.HasValue ? (decimal?)money.Value.Amount : null,
                    value => value.HasValue ? new Money(value.Value) : (Money?)null)
                .HasPrecision(18, 2);
            bill.Property(b => b.CategoryId).HasConversion(
                id => id.HasValue ? id.Value.Value : (Guid?)null,
                value => value.HasValue ? new CategoryId(value.Value) : (CategoryId?)null);
            bill.Property(b => b.AccountId).HasConversion(
                id => id.HasValue ? id.Value.Value : (Guid?)null,
                value => value.HasValue ? new AccountId(value.Value) : (AccountId?)null);
            bill.HasIndex(b => b.UserId);
            bill.HasOne<AppUser>().WithMany().HasForeignKey(b => b.UserId).OnDelete(DeleteBehavior.Restrict);
            bill.HasOne<Domain.Categories.Category>().WithMany().HasForeignKey(b => b.CategoryId).OnDelete(DeleteBehavior.Restrict);
            bill.HasOne<Domain.Accounts.Account>().WithMany().HasForeignKey(b => b.AccountId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Notification>(notification =>
        {
            notification.Property(n => n.Id).HasConversion(id => id.Value, value => new NotificationId(value));
            notification.Property(n => n.Title).HasMaxLength(200);
            notification.Property(n => n.Message).HasMaxLength(1000);
            notification.Property(n => n.RelatedType).HasMaxLength(50);
            notification.HasIndex(n => new { n.UserId, n.IsRead });
            notification.HasOne<AppUser>().WithMany().HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Household>(household =>
        {
            household.Property(h => h.Id).HasConversion(id => id.Value, value => new HouseholdId(value));
            household.Property(h => h.Name).HasMaxLength(100);
        });

        builder.Entity<HouseholdMembership>(membership =>
        {
            membership.Property(m => m.Id)
                .HasConversion(id => id.Value, value => new HouseholdMembershipId(value));
            membership.Property(m => m.HouseholdId).HasConversion(id => id.Value, value => new HouseholdId(value));
            membership.HasIndex(m => new { m.HouseholdId, m.UserId }).IsUnique();
            membership.HasIndex(m => m.UserId);
            membership.HasOne<Household>().WithMany().HasForeignKey(m => m.HouseholdId).OnDelete(DeleteBehavior.Restrict);
            membership.HasOne<AppUser>().WithMany().HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    private void ApplyEntityRules()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries<EntityBase>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    entry.Entity.UpdatedAt = now;
                    if (entry.Entity is OwnableEntity { UserId: var userId } ownable && userId == Guid.Empty)
                    {
                        ownable.UserId = CurrentUserId;
                    }
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    break;
                case EntityState.Deleted:
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.UpdatedAt = now;
                    break;
                case EntityState.Detached:
                case EntityState.Unchanged:
                    break;
                default:
                    throw new ArgumentOutOfRangeException();
            }
        }
    }

    private void ApplyQueryFilters(ModelBuilder builder)
    {
        var ownableFilterFactory = GetType().GetMethod(nameof(OwnableFilter), BindingFlags.NonPublic | BindingFlags.Instance)!;
        var shareableFilterFactory = GetType().GetMethod(nameof(ShareableFilter), BindingFlags.NonPublic | BindingFlags.Instance)!;

        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;
            if (clrType == typeof(Transaction))
            {
                entityType.SetQueryFilter(TransactionFilter());
            }
            else if (clrType == typeof(Transfer))
            {
                entityType.SetQueryFilter(TransferFilter());
            }
            else if (clrType == typeof(Household))
            {
                entityType.SetQueryFilter(HouseholdFilter());
            }
            else if (clrType == typeof(HouseholdMembership))
            {
                entityType.SetQueryFilter(HouseholdMembershipFilter());
            }
            else if (typeof(IShareable).IsAssignableFrom(clrType) && typeof(OwnableEntity).IsAssignableFrom(clrType))
            {
                var filter = (LambdaExpression)shareableFilterFactory.MakeGenericMethod(clrType).Invoke(this, null)!;
                entityType.SetQueryFilter(filter);
            }
            else if (typeof(OwnableEntity).IsAssignableFrom(clrType))
            {
                var filter = (LambdaExpression)ownableFilterFactory.MakeGenericMethod(clrType).Invoke(this, null)!;
                entityType.SetQueryFilter(filter);
            }
            else if (typeof(EntityBase).IsAssignableFrom(clrType))
            {
                var parameter = Expression.Parameter(clrType, "entity");
                var isDeleted = Expression.Property(parameter, nameof(EntityBase.IsDeleted));
                var filter = Expression.Lambda(Expression.Equal(isDeleted, Expression.Constant(false)), parameter);
                entityType.SetQueryFilter(filter);
            }
        }
    }

    private Expression<Func<T, bool>> OwnableFilter<T>() where T : OwnableEntity =>
        entity => !entity.IsDeleted && entity.UserId == CurrentUserId;

    private Expression<Func<T, bool>> ShareableFilter<T>() where T : OwnableEntity, IShareable =>
        entity => !entity.IsDeleted &&
            (entity.UserId == CurrentUserId ||
                (entity.Scope == Scope.Shared && entity.HouseholdId != null &&
                    HouseholdMemberships.Any(m => m.HouseholdId == entity.HouseholdId && m.UserId == CurrentUserId)));

    private Expression<Func<Transaction, bool>> TransactionFilter() =>
        t => !t.IsDeleted &&
            (t.UserId == CurrentUserId ||
                Accounts.Any(a => a.Id == t.AccountId
                    && a.Scope == Scope.Shared
                    && a.HouseholdId != null
                    && HouseholdMemberships.Any(m => m.HouseholdId == a.HouseholdId && m.UserId == CurrentUserId)));

    private Expression<Func<Transfer, bool>> TransferFilter() =>
        t => !t.IsDeleted &&
            (t.UserId == CurrentUserId ||
                Accounts.Any(a => (a.Id == t.FromAccountId || a.Id == t.ToAccountId)
                    && a.Scope == Scope.Shared
                    && a.HouseholdId != null
                    && HouseholdMemberships.Any(m => m.HouseholdId == a.HouseholdId && m.UserId == CurrentUserId)));

    private Expression<Func<Household, bool>> HouseholdFilter() =>
        h => !h.IsDeleted && HouseholdMemberships.Any(m => m.HouseholdId == h.Id && m.UserId == CurrentUserId);

    private Expression<Func<HouseholdMembership, bool>> HouseholdMembershipFilter() =>
        m => !m.IsDeleted && HouseholdMemberships.Any(m2 => m2.HouseholdId == m.HouseholdId && m2.UserId == CurrentUserId);
}
