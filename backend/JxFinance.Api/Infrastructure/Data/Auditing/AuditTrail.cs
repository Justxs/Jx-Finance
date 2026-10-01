using JxFinance.Domain.Accounts;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Households;

namespace JxFinance.Infrastructure.Data.Auditing;

public sealed class AuditTrail
{
    private AuditSummary? summary;

    public void Summarise(
        AuditAction action,
        AuditEntityKind kind,
        string description,
        int count,
        Guid? entityId = null,
        IEnumerable<AccountId>? accounts = null,
        HouseholdId? household = null) =>
        summary = new AuditSummary(action, kind, description, count, entityId, [.. (accounts ?? []).Distinct()], household);

    internal AuditSummary? Take()
    {
        var taken = summary;
        summary = null;
        return taken;
    }
}

internal sealed record AuditSummary(
    AuditAction Action,
    AuditEntityKind Kind,
    string Description,
    int Count,
    Guid? EntityId,
    IReadOnlyList<AccountId> Accounts,
    HouseholdId? Household);
