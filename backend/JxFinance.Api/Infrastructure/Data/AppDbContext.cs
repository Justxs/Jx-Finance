using System.Linq.Expressions;
using System.Reflection;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUser currentUser)
    : IdentityDbContext<AppUser, AppRole, Guid>(options)
{
    private readonly Guid _currentUserId = currentUser.Id;

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();

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
        builder.Entity<Account>(account =>
        {
            account.Property(a => a.Id).HasConversion(id => id.Value, value => new AccountId(value));
            account.Property(a => a.Name).HasMaxLength(100);
            account.Property(a => a.Description).HasMaxLength(500);
            account.Property(a => a.Iban).HasMaxLength(34);
            account.Property(a => a.StartingBalance)
                .HasConversion(money => money.Amount, value => new Money(value))
                .HasPrecision(18, 2);
            account.HasIndex(a => a.UserId);
            account.HasOne<AppUser>().WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Category>(category =>
        {
            category.Property(c => c.Id).HasConversion(id => id.Value, value => new CategoryId(value));
            category.Property(c => c.Name).HasMaxLength(100);
            category.Property(c => c.Icon).HasMaxLength(50);
            category.HasIndex(c => c.UserId);
            category.HasOne<AppUser>().WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Restrict);
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
                        ownable.UserId = _currentUserId;
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

        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;
            if (typeof(OwnableEntity).IsAssignableFrom(clrType))
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
        entity => !entity.IsDeleted && entity.UserId == _currentUserId;
}
