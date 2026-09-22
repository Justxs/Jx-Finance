using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Households.GetHouseholdAudit;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Households.Services;

[RegisterService<IHouseholdAuditService>(LifeTime.Scoped)]
public sealed class HouseholdAuditService(AppDbContext db, ICurrentUser currentUser, IClock clock)
    : IHouseholdAuditService
{
    private static readonly DomainError NotFound = new(ErrorCodes.ResourceNotFound, "Household not found.");

    public async Task<Result<PagedResponse<AuditEventResponse>>> GetPageAsync(
        GetHouseholdAuditRequest request,
        CancellationToken cancellationToken)
    {
        var householdId = new HouseholdId(request.Id);
        if (currentUser.ActiveHouseholdId is { } active && active != householdId)
        {
            return NotFound;
        }

        if (!await db.Households.AnyAsync(h => h.Id == householdId, cancellationToken))
        {
            return NotFound;
        }

        var query = db.AuditEvents.AsNoTracking().Where(e => e.HouseholdId == householdId);
        if (request.MemberId is { } memberId)
        {
            query = query.Where(e => e.ActorUserId == memberId);
        }

        if (request.Kind is { } kind)
        {
            query = query.Where(e => e.EntityKind == kind);
        }

        if (request.DateFrom is { } dateFrom)
        {
            var start = clock.StartOfDay(dateFrom);
            query = query.Where(e => e.OccurredAt >= start);
        }

        if (request.DateTo is { } dateTo)
        {
            var end = clock.StartOfDay(dateTo.AddDays(1));
            query = query.Where(e => e.OccurredAt < end);
        }

        var page = await query.ToPageAsync(
            request,
            sorted => sorted.OrderByDescending(e => e.OccurredAt).ThenBy(e => e.EntityKind).ThenBy(e => e.Id),
            cancellationToken);

        var actorIds = page.Items.Select(e => e.ActorUserId).Distinct().ToList();
        var actors = await db.Users
            .AsNoTracking()
            .Where(u => actorIds.Contains(u.Id))
            .Select(u => new { u.Id, u.DisplayName, u.Email })
            .ToListAsync(cancellationToken);
        var names = actors.ToDictionary(u => u.Id, u => AppUser.DisplayNameOrEmail(u.DisplayName, u.Email));

        return page.Map(e => ToResponse(e, names.GetValueOrDefault(e.ActorUserId) ?? ""));
    }

    private static AuditEventResponse ToResponse(AuditEvent auditEvent, string actorName) => new(
        auditEvent.Id.Value,
        auditEvent.OccurredAt,
        auditEvent.ActorUserId,
        actorName,
        auditEvent.Action,
        auditEvent.EntityKind,
        auditEvent.EntityId,
        auditEvent.Description,
        auditEvent.Count,
        [.. auditEvent.Changes.Select(c => new AuditChangeResponse(c.Field, c.From, c.To))]);
}
