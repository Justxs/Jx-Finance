using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Sharing;

public abstract class ShareableSet(Type entityType, DeletionChangeKind shareKind, string one, string many)
{
    public static IReadOnlyList<ShareableSet> All { get; } =
    [
        new Of<Account, AccountId>(db => db.Accounts, DeletionChangeKind.AccountShare, "account", "accounts"),
        new Of<Category, CategoryId>(db => db.Categories, DeletionChangeKind.CategoryShare, "category", "categories"),
        new Of<Tag, TagId>(db => db.Tags, DeletionChangeKind.TagShare, "tag", "tags"),
    ];

    public Type EntityType { get; } = entityType;
    public DeletionChangeKind ShareKind { get; } = shareKind;
    public string One { get; } = one;
    public string Many { get; } = many;

    public abstract Task<IReadOnlyList<SharedRow>> InHouseholdAsync(
        AppDbContext db,
        HouseholdId householdId,
        CancellationToken cancellationToken);

    public abstract Task MakePersonalAsync(
        AppDbContext db,
        HouseholdId householdId,
        Guid? ownerId,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    public abstract Task ReshareAsync(
        AppDbContext db,
        IReadOnlyList<Guid> rowIds,
        IReadOnlyList<Guid> members,
        HouseholdId householdId,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    private sealed class Of<TEntity, TId>(
        Func<AppDbContext, DbSet<TEntity>> set,
        DeletionChangeKind shareKind,
        string one,
        string many) : ShareableSet(typeof(TEntity), shareKind, one, many)
        where TEntity : OwnableEntity, IShareable
        where TId : struct, IStronglyTypedId<TId>
    {
        private const string IdProperty = "Id";

        public override async Task<IReadOnlyList<SharedRow>> InHouseholdAsync(
            AppDbContext db,
            HouseholdId householdId,
            CancellationToken cancellationToken)
        {
            var rows = await Rows(db)
                .Where(e => e.HouseholdId == householdId)
                .Select(e => new { Id = EF.Property<TId>(e, IdProperty), e.IsDeleted })
                .ToListAsync(cancellationToken);

            return [.. rows.Select(row => new SharedRow(row.Id.Value, row.IsDeleted))];
        }

        public override Task MakePersonalAsync(
            AppDbContext db,
            HouseholdId householdId,
            Guid? ownerId,
            DateTimeOffset now,
            CancellationToken cancellationToken) =>
            Rows(db)
                .Where(e => e.HouseholdId == householdId && (ownerId == null || e.UserId == ownerId))
                .SetSharingAsync(Scope.Personal, null, now, cancellationToken);

        public override Task ReshareAsync(
            AppDbContext db,
            IReadOnlyList<Guid> rowIds,
            IReadOnlyList<Guid> members,
            HouseholdId householdId,
            DateTimeOffset now,
            CancellationToken cancellationToken)
        {
            var ids = rowIds.Select(TId.From).ToList();
            return Rows(db)
                .Where(e => ids.Contains(EF.Property<TId>(e, IdProperty))
                    && e.Scope == Scope.Personal
                    && e.HouseholdId == null
                    && members.Contains(e.UserId))
                .SetSharingAsync(Scope.Shared, householdId, now, cancellationToken);
        }

        private IQueryable<TEntity> Rows(AppDbContext db) => set(db).IgnoreQueryFilters();
    }
}
