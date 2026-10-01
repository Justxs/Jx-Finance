using System.Linq.Expressions;
using System.Reflection;
using JxFinance.Common.Spreads;
using JxFinance.Common.Subscriptions;
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
using JxFinance.Domain.Imports;
using JxFinance.Domain.Investments;
using JxFinance.Domain.MonthCloses;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.Payees;
using JxFinance.Domain.Receipts;
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
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace JxFinance.Infrastructure.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUser currentUser, IClock clock)
    : IdentityDbContext<AppUser, AppRole, Guid>(options)
{
    private static readonly string[] UnusualInputs =
    [
        nameof(Transaction.AccountId),
        nameof(Transaction.CategoryId),
        nameof(Transaction.Type),
        nameof(Transaction.Date),
        nameof(Transaction.Description),
        nameof(Transaction.IsSplit),
    ];

    private Guid CurrentUserId => currentUser.Id;

    private HouseholdId? ActiveHouseholdId => currentUser.ActiveHouseholdId;

    private bool HasActiveHousehold => currentUser.ActiveHouseholdId is not null;

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<AccountReconciliation> AccountReconciliations => Set<AccountReconciliation>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<CategorizationRule> CategorizationRules => Set<CategorizationRule>();
    public DbSet<CategorizationRuleTag> CategorizationRuleTags => Set<CategorizationRuleTag>();
    public DbSet<SuggestedRuleDismissal> SuggestedRuleDismissals => Set<SuggestedRuleDismissal>();
    public DbSet<CsvImportMapping> CsvImportMappings => Set<CsvImportMapping>();
    public DbSet<PayeeName> PayeeNames => Set<PayeeName>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<TransactionLine> TransactionLines => Set<TransactionLine>();
    public DbSet<TransactionTag> TransactionTags => Set<TransactionTag>();
    public DbSet<TransactionAttachment> TransactionAttachments => Set<TransactionAttachment>();
    public DbSet<TransactionGroup> TransactionGroups => Set<TransactionGroup>();
    public DbSet<DuplicateDismissal> DuplicateDismissals => Set<DuplicateDismissal>();
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
    public DbSet<AssetValuation> AssetValuations => Set<AssetValuation>();
    public DbSet<Debt> Debts => Set<Debt>();
    public DbSet<DebtPayment> DebtPayments => Set<DebtPayment>();
    public DbSet<RecurringBill> RecurringBills => Set<RecurringBill>();
    public DbSet<SubscriptionDismissal> SubscriptionDismissals => Set<SubscriptionDismissal>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NetWorthSnapshot> NetWorthSnapshots => Set<NetWorthSnapshot>();
    public DbSet<MonthClose> MonthCloses => Set<MonthClose>();
    public DbSet<Household> Households => Set<Household>();
    public DbSet<HouseholdMembership> HouseholdMemberships => Set<HouseholdMembership>();
    public DbSet<SharedExpense> SharedExpenses => Set<SharedExpense>();
    public DbSet<SharedExpenseShare> SharedExpenseShares => Set<SharedExpenseShare>();
    public DbSet<Settlement> Settlements => Set<Settlement>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<PersonalApiToken> PersonalApiTokens => Set<PersonalApiToken>();
    public DbSet<ApiIdempotencyKey> ApiIdempotencyKeys => Set<ApiIdempotencyKey>();
    public DbSet<EmailMessage> EmailMessages => Set<EmailMessage>();
    public DbSet<DiscordWebhook> DiscordWebhooks => Set<DiscordWebhook>();
    public DbSet<DiscordMessage> DiscordMessages => Set<DiscordMessage>();
    public DbSet<DeletionEntry> DeletionEntries => Set<DeletionEntry>();
    public DbSet<DeletionChange> DeletionChanges => Set<DeletionChange>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();
    public DbSet<ReceiptReading> ReceiptReadings => Set<ReceiptReading>();
    public DbSet<ReceiptItemCategory> ReceiptItemCategories => Set<ReceiptItemCategory>();

    public AuditTrail Audit { get; } = new();

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

        var events = await new AuditCollector(this, actorId, currentUser.TokenName, now).CollectAsync(summary, cancellationToken);
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
            var candidates = entityType.GetDeclaredProperties().Where(property => !property.IsForeignKey()).ToList();
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
                    if (entry.Entity is DeletionEntry { DeletedAt.Ticks: 0 } deletion)
                    {
                        deletion.DeletedAt = now;
                    }

                    if (entry.Entity is OwnableEntity { UserId: var userId } ownable && userId == Guid.Empty)
                    {
                        ownable.UserId = CurrentUserId;
                    }

                    if (entry.Entity is Transaction added)
                    {
                        added.PayeeKey = SubscriptionDescription.Normalize(added.Description);
                        SetSpreadUntil(added);
                    }
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    if (entry.Entity is Transaction edited && entry.Property(nameof(Transaction.Description)).IsModified)
                    {
                        edited.PayeeKey = SubscriptionDescription.Normalize(edited.Description);
                    }

                    if (entry.Entity is Transaction spread
                        && (entry.Property(nameof(Transaction.Date)).IsModified || entry.Property(nameof(Transaction.SpreadMonths)).IsModified))
                    {
                        SetSpreadUntil(spread);
                    }

                    if (entry.Entity is Transaction transaction && ChangesUnusualInputs(entry))
                    {
                        transaction.RecheckUnusual();
                    }

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

    private static void SetSpreadUntil(Transaction transaction) =>
        transaction.SpreadUntil = transaction.SpreadMonths is { } months ? SpreadSlices.Until(transaction.Date, months) : null;

    private static bool ChangesUnusualInputs(EntityEntry<EntityBase> entry) =>
        entry.Properties.Any(p => p.IsModified && UnusualInputs.Contains(p.Metadata.Name))
        || entry.ComplexProperty(nameof(Transaction.Amount)).Properties.Any(p => p.IsModified);

    private void ApplyQueryFilters(ModelBuilder builder)
    {
        var ownableFilterFactory = GetType().GetMethod(nameof(OwnableFilter), BindingFlags.NonPublic | BindingFlags.Instance)!;
        var shareableFilterFactory = GetType().GetMethod(nameof(ShareableFilter), BindingFlags.NonPublic | BindingFlags.Instance)!;
        var accountScopedFilterFactory = GetType().GetMethod(nameof(AccountScopedFilter), BindingFlags.NonPublic | BindingFlags.Instance)!;
        var householdScopedFilterFactory = GetType().GetMethod(nameof(HouseholdScopedFilter), BindingFlags.NonPublic | BindingFlags.Instance)!;

        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;
            if (!typeof(EntityBase).IsAssignableFrom(clrType))
            {
                continue;
            }

            entityType.SetQueryFilter(QueryFilters.SoftDelete, NotDeletedFilter(clrType));
            var owner = OwnerFilter(clrType, ownableFilterFactory, shareableFilterFactory, accountScopedFilterFactory, householdScopedFilterFactory);
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
        MethodInfo accountScopedFilterFactory,
        MethodInfo householdScopedFilterFactory)
    {
        if (typeof(IAccountScoped).IsAssignableFrom(clrType))
        {
            return (LambdaExpression)accountScopedFilterFactory.MakeGenericMethod(clrType).Invoke(this, null)!;
        }

        if (clrType == typeof(TransactionAttachment))
        {
            return AttachmentFilter();
        }

        if (clrType == typeof(DebtPayment))
        {
            return DebtPaymentFilter();
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

        if (typeof(IHouseholdScoped).IsAssignableFrom(clrType))
        {
            return (LambdaExpression)householdScopedFilterFactory.MakeGenericMethod(clrType).Invoke(this, null)!;
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

    private Expression<Func<T, bool>> HouseholdScopedFilter<T>() where T : EntityBase, IHouseholdScoped =>
        entity => Households.Any(h => h.Id == entity.HouseholdId) && (!HasActiveHousehold || entity.HouseholdId == ActiveHouseholdId);

    private Expression<Func<TransactionAttachment, bool>> AttachmentFilter() =>
        a => Transactions.Any(t => t.Id == a.TransactionId);

    private Expression<Func<DebtPayment, bool>> DebtPaymentFilter() =>
        p => Debts.Any(d => d.Id == p.DebtId);

    private Expression<Func<Transfer, bool>> TransferFilter() =>
        t => Accounts.Any(a => a.Id == t.FromAccountId || a.Id == t.ToAccountId);

    private Expression<Func<Household, bool>> HouseholdFilter() =>
        h => HouseholdMemberships.Any(m => m.HouseholdId == h.Id && m.UserId == CurrentUserId);

    private Expression<Func<HouseholdMembership, bool>> HouseholdMembershipFilter() =>
        m => HouseholdMemberships.Any(m2 => m2.HouseholdId == m.HouseholdId && m2.UserId == CurrentUserId);
}
