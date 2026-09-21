namespace JxFinance.Domain.Audit;

public enum AuditAction
{
    Created,
    Updated,
    Deleted,
    Restored,
    Imported,
    Shared,
    Unshared,
    MemberAdded,
    MemberRemoved,
    MemberRoleChanged,
    Renamed,
}
