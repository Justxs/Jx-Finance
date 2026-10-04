using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.References;
using JxFinance.Common.Settings;
using JxFinance.Common.Sharing;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.RecurringBills.CreateRecurringBill;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Mappers;
using JxFinance.Endpoints.RecurringBills.Shared;
using JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.RecurringBills.Services;

[RegisterService<IRecurringBillService>(LifeTime.Scoped)]
public sealed class RecurringBillService(
    AppDbContext db,
    IReferenceGuard references,
    IDeletionRecorder deletions,
    IInstanceSettingsStore settings,
    ISharingGuard sharing,
    ICurrentUser currentUser,
    IClock clock) : IRecurringBillService
{
    private readonly RecurringBillLookup lookup = new(db, settings, clock, currentUser);

    private static readonly DomainError DebtMissing = new(ErrorCodes.ReferenceNotFound, "Debt does not exist.");
    private static readonly DomainError DebtNotTracked = new(ErrorCodes.DebtNotTracked, "Turn on payment tracking for this debt first.");

    private static readonly DomainError PaysFromUnsharedAccount = new(
        ErrorCodes.HouseholdReferenceNotShared,
        "A recurring entry that pays a shared debt must use an account shared with the debt's household.");

    private static readonly DomainError CategoryNotExpense =
        new(ErrorCodes.CategoryWrongType, "Choose an accessible expense category.");

    private static readonly DomainError CategoryNotIncome =
        new(ErrorCodes.CategoryWrongType, "Choose an accessible income category.");

    public async Task<IReadOnlyList<RecurringBillResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var bills = await db.RecurringBills.AsNoTracking().OrderBy(b => b.NextDueDate).ToListAsync(cancellationToken);
        var matches = await lookup.LatestMatchesAsync(bills, cancellationToken);
        return bills.Select(b => b.ToResponse(matches.GetValueOrDefault(b.Id), currentUser.Id)).ToList();
    }

    public async Task<Result<RecurringBillResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await lookup.FindAsync(id, cancellationToken) is { } bill
            ? await lookup.ResponseAsync(bill, cancellationToken)
            : RecurringBillLookup.NotFound;
    }

    public async Task<Result<RecurringBillResponse>> CreateAsync(
        CreateRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        var error = await sharing.CheckAsync(request, cancellationToken) ?? await ValidateReferencesAsync(request, cancellationToken);
        if (error is not null) return error;

        var bill = request.ToEntity();
        db.RecurringBills.Add(bill);
        await db.SaveChangesAsync(cancellationToken);

        return await lookup.ResponseAsync(bill, cancellationToken);
    }

    public async Task<Result<RecurringBillResponse>> UpdateAsync(
        UpdateRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        if (await lookup.FindAsync(request.Id, cancellationToken) is not { } bill)
        {
            return RecurringBillLookup.NotFound;
        }

        var error = await sharing.CheckAsync(bill, request, cancellationToken) ?? await ValidateReferencesAsync(request, cancellationToken);
        if (error is not null) return error;

        request.ApplyTo(bill);
        await db.SaveChangesAsync(cancellationToken);

        return await lookup.ResponseAsync(bill, cancellationToken);
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        return db.DeleteOrNotFoundAsync<RecurringBill>(
            id,
            b => b.Id == billId,
            RecurringBillLookup.NotFound,
            bill =>
            {
                if (bill.UserId != currentUser.Id)
                {
                    return Task.FromResult<DomainError?>(new DomainError(ErrorCodes.AccessForbidden, "Only the owner can delete a shared recurring entry."));
                }

                deletions.Record(TrashKind.RecurringBill, id, bill.Name);
                return Task.FromResult<DomainError?>(null);
            },
            cancellationToken);
    }

    private async Task<DomainError?> ValidateReferencesAsync(IRecurringBillInput input, CancellationToken ct)
    {
        if (input.AccountId is { } from && await references.AccountExistsAsync(new AccountId(from), ct) is { } fromError) return fromError;
        if (input.ToAccountId is { } to && await references.AccountExistsAsync(new AccountId(to), ct) is { } toError) return toError;
        if (input.DebtId is { } debt && settings.Current.IsEnabled(Feature.NetWorth))
        {
            var found = await db.Debts
                .Where(d => d.Id == new DebtId(debt))
                .Select(d => new { d.TracksPayments, d.Scope, d.HouseholdId })
                .FirstOrDefaultAsync(ct);
            if (found is null) return DebtMissing;
            if (!found.TracksPayments) return DebtNotTracked;
            if (found is { Scope: Scope.Shared, HouseholdId: { } debtHousehold }
                && input.AccountId is { } paidFrom
                && !await db.Accounts.AnyAsync(a => a.Id == new AccountId(paidFrom) && a.Scope == Scope.Shared && a.HouseholdId == debtHousehold, ct))
            {
                return PaysFromUnsharedAccount;
            }
        }

        var shared = new SharedReferences(
            [.. new[] { input.AccountId, input.ToAccountId }.OfType<Guid>().Select(id => new AccountId(id))],
            input.CategoryId is { } category ? [new CategoryId(category)] : [],
            [],
            input.DebtId is { } debtId ? [new DebtId(debtId)] : []);
        if (await sharing.CheckReferencesAsync(input, shared, ct) is { } sharingError) return sharingError;
        if (input.Shape == RecurringBillShape.Transfer || input.CategoryId is not { } categoryId) return null;

        var flow = RecurringBillLookup.FlowOf(input.Shape);
        return await references.CategoryOfTypeAsync(
            new CategoryId(categoryId),
            flow,
            flow == FlowType.Income ? CategoryNotIncome : CategoryNotExpense,
            ct);
    }
}
