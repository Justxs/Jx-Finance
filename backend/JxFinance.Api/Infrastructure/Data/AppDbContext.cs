using System.Linq.Expressions;
using System.Reflection;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Common;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Email;
using JxFinance.Domain.ExchangeRates;
using JxFinance.Domain.Goals;
using JxFinance.Domain.Households;
using JxFinance.Domain.Investments;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data.Auditing;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUser currentUser, IClock clock)
    : IdentityDbContext<AppUser, AppRole, Guid>(options)
{
    private static readonly (Type Entity, string Property)[] UnconstrainedReferences =
    [
        (typeof(BrokerConnection), nameof(BrokerConnection.FundingAccountId)),
    ];

    private Guid CurrentUserId => currentUser.Id;

    private HouseholdId? ActiveHouseholdId => currentUser.ActiveHouseholdId;

    private bool HasActiveHousehold => currentUser.ActiveHouseholdId is not null;

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<CategorizationRule> CategorizationRules => Set<CategorizationRule>();
    public DbSet<CategorizationRuleTag> CategorizationRuleTags => Set<CategorizationRuleTag>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<TransactionLine> TransactionLines => Set<TransactionLine>();
    public DbSet<TransactionTag> TransactionTags => Set<TransactionTag>();
    public DbSet<TransactionAttachment> TransactionAttachments => Set<TransactionAttachment>();
    public DbSet<TransferImport> TransferImports => Set<TransferImport>();
    public DbSet<Transfer> Transfers => Set<Transfer>();
    public DbSet<CurrencyConversion> CurrencyConversions => Set<CurrencyConversion>();
    public DbSet<ExchangeRate> ExchangeRates => Set<ExchangeRate>();
    public DbSet<Security> Securities => Set<Security>();
    public DbSet<SecurityPrice> SecurityPrices => Set<SecurityPrice>();
    public DbSet<InvestmentTransaction> InvestmentTransactions => Set<InvestmentTransaction>();
    public DbSet<BrokerConnection> BrokerConnections => Set<BrokerConnection>();
    public DbSet<InstanceSettings> InstanceSettings => Set<InstanceSettings>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<Debt> Debts => Set<Debt>();
    public DbSet<RecurringBill> RecurringBills => Set<RecurringBill>();
    public DbSet<SubscriptionDismissal> SubscriptionDismissals => Set<SubscriptionDismissal>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NetWorthSnapshot> NetWorthSnapshots => Set<NetWorthSnapshot>();
    public DbSet<Household> Households => Set<Household>();
    public DbSet<HouseholdMembership> HouseholdMemberships => Set<HouseholdMembership>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<EmailMessage> EmailMessages => Set<EmailMessage>();
    public DbSet<DeletionEntry> DeletionEntries => Set<DeletionEntry>();
    public DbSet<DeletionChange> DeletionChanges => Set<DeletionChange>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();

    public AuditTrail Audit { get; } = new();

    public static AppDbContext For(IServiceProvider services, Guid userId) =>
        new(services.GetRequiredService<DbContextOptions<AppDbContext>>(), new FixedUser(userId), services.GetRequiredService<IClock>());

    public override int SaveChanges(bool acceptAllChangesOnSuccess) =>
        throw new NotSupportedException("Saving is asynchronous; call SaveChangesAsync instead.");

    public override async Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        var now = ApplyEntityRules();
        await RecordAuditAsync(now, cancellationToken);
        return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private async Task RecordAuditAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var summary = Audit.Take();
        var actorId = CurrentUserId;
        if (actorId == Guid.Empty)
        {
            return;
        }

        var events = await new AuditCollector(this, actorId, now).CollectAsync(summary, cancellationToken);
        if (events.Count > 0)
        {
            AuditEvents.AddRange(events);
        }
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        base.ConfigureConventions(configurationBuilder);

        var idTypes = typeof(IStronglyTypedId<>).Assembly.GetTypes()
            .Where(type => type.IsValueType && type.GetInterfaces().Any(contract =>
                contract.IsGenericType && contract.GetGenericTypeDefinition() == typeof(IStronglyTypedId<>)));
        foreach (var idType in idTypes)
        {
            configurationBuilder.Properties(idType)
                .HaveConversion(typeof(StronglyTypedIdConverter<>).MakeGenericType(idType));
        }

        configurationBuilder.Properties<decimal>().HavePrecision(18, 2);
        configurationBuilder.Properties<Currency>().HaveConversion<CurrencyConverter>().HaveMaxLength(3);
        configurationBuilder.Properties<Money>().HaveConversion<MoneyConverter>().HavePrecision(18, 2);
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        ConfigureOwnership(builder);
        ConfigureReferences(builder);
        ApplyQueryFilters(builder);
    }

    private static void ConfigureOwnership(ModelBuilder builder)
    {
        var clrTypes = builder.Model.GetEntityTypes().Select(entityType => entityType.ClrType).ToList();

        foreach (var clrType in clrTypes.Where(typeof(OwnableEntity).IsAssignableFrom))
        {
            builder.Entity(clrType)
                .HasOne(typeof(AppUser))
                .WithMany()
                .HasForeignKey(nameof(OwnableEntity.UserId))
                .OnDelete(DeleteBehavior.Restrict);
        }
    }

    private static void ConfigureReferences(ModelBuilder builder)
    {
        var entityTypes = builder.Model.GetEntityTypes().Where(entityType => !entityType.IsOwned()).ToList();
        var principals = entityTypes
            .Select(entityType => (entityType.ClrType, Key: entityType.FindPrimaryKey()?.Properties))
            .Where(entity => entity.Key is [var key] && typeof(IStronglyTypedId).IsAssignableFrom(key.ClrType))
            .ToDictionary(entity => entity.Key![0].ClrType, entity => entity.ClrType);

        foreach (var entityType in entityTypes)
        {
            var candidates = entityType.GetDeclaredProperties()
                .Where(property => !property.IsForeignKey() && !UnconstrainedReferences.Contains((entityType.ClrType, property.Name)))
                .ToList();
            foreach (var property in candidates)
            {
                if (principals.TryGetValue(Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType, out var principal)
                    && principal != entityType.ClrType)
                {
                    builder.Entity(entityType.ClrType)
                        .HasOne(principal)
                        .WithMany()
                        .HasForeignKey(property.Name)
                        .OnDelete(DeleteBehavior.Restrict);
                }
            }
        }
    }

    private DateTimeOffset ApplyEntityRules()
    {
        var now = clock.UtcNow;
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
                    throw new InvalidOperationException($"Unhandled entity state: {entry.State}.");
            }
        }

        return now;
    }

    private void ApplyQueryFilters(ModelBuilder builder)
    {
        var ownableFilterFactory = GetType().GetMethod(nameof(OwnableFilter), BindingFlags.NonPublic | BindingFlags.Instance)!;
        var shareableFilterFactory = GetType().GetMethod(nameof(ShareableFilter), BindingFlags.NonPublic | BindingFlags.Instance)!;
        var accountScopedFilterFactory = GetType().GetMethod(nameof(AccountScopedFilter), BindingFlags.NonPublic | BindingFlags.Instance)!;

        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;
            if (!typeof(EntityBase).IsAssignableFrom(clrType))
            {
                continue;
            }

            entityType.SetQueryFilter(QueryFilters.SoftDelete, NotDeletedFilter(clrType));
            var owner = OwnerFilter(clrType, ownableFilterFactory, shareableFilterFactory, accountScopedFilterFactory);
            if (owner is not null)
            {
                entityType.SetQueryFilter(QueryFilters.Owner, owner);
            }
        }
    }

    private LambdaExpression? OwnerFilter(
        Type clrType,
        MethodInfo ownableFilterFactory,
        MethodInfo shareableFilterFactory,
        MethodInfo accountScopedFilterFactory)
    {
        if (typeof(IAccountScoped).IsAssignableFrom(clrType))
        {
            return (LambdaExpression)accountScopedFilterFactory.MakeGenericMethod(clrType).Invoke(this, null)!;
        }

        if (clrType == typeof(TransactionAttachment))
        {
            return AttachmentFilter();
        }

        if (clrType == typeof(Transfer))
        {
            return TransferFilter();
        }

        if (clrType == typeof(Household))
        {
            return HouseholdFilter();
        }

        if (clrType == typeof(HouseholdMembership))
        {
            return HouseholdMembershipFilter();
        }

        if (typeof(IShareable).IsAssignableFrom(clrType) && typeof(OwnableEntity).IsAssignableFrom(clrType))
        {
            return (LambdaExpression)shareableFilterFactory.MakeGenericMethod(clrType).Invoke(this, null)!;
        }

        return typeof(OwnableEntity).IsAssignableFrom(clrType)
            ? (LambdaExpression)ownableFilterFactory.MakeGenericMethod(clrType).Invoke(this, null)!
            : null;
    }

    private static LambdaExpression NotDeletedFilter(Type clrType)
    {
        var parameter = Expression.Parameter(clrType, "entity");
        var isDeleted = Expression.Property(parameter, nameof(EntityBase.IsDeleted));
        return Expression.Lambda(Expression.Equal(isDeleted, Expression.Constant(false)), parameter);
    }

    private Expression<Func<T, bool>> OwnableFilter<T>() where T : OwnableEntity =>
        entity => entity.UserId == CurrentUserId;

    private Expression<Func<T, bool>> ShareableFilter<T>() where T : OwnableEntity, IShareable =>
        entity =>
            (entity.UserId == CurrentUserId ||
                (entity.Scope == Scope.Shared && entity.HouseholdId != null &&
                    HouseholdMemberships.Any(m => m.HouseholdId == entity.HouseholdId && m.UserId == CurrentUserId))) &&
            (!HasActiveHousehold || entity.Scope == Scope.Personal || entity.HouseholdId == ActiveHouseholdId);

    private Expression<Func<T, bool>> AccountScopedFilter<T>() where T : EntityBase, IAccountScoped =>
        entity => Accounts.Any(a => a.Id == entity.AccountId);

    private Expression<Func<TransactionAttachment, bool>> AttachmentFilter() =>
        a => Transactions.Any(t => t.Id == a.TransactionId);

    private Expression<Func<Transfer, bool>> TransferFilter() =>
        t => Accounts.Any(a => a.Id == t.FromAccountId || a.Id == t.ToAccountId);

    private Expression<Func<Household, bool>> HouseholdFilter() =>
        h => HouseholdMemberships.Any(m => m.HouseholdId == h.Id && m.UserId == CurrentUserId);

    private Expression<Func<HouseholdMembership, bool>> HouseholdMembershipFilter() =>
        m => HouseholdMemberships.Any(m2 => m2.HouseholdId == m.HouseholdId && m2.UserId == CurrentUserId);
}
