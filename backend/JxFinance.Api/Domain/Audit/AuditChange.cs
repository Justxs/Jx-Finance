namespace JxFinance.Domain.Audit;

public sealed record AuditChange(string Field, string? From, string? To);
