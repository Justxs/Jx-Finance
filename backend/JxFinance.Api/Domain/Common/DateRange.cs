namespace JxFinance.Domain.Common;

public readonly record struct DateRange(DateTimeOffset StartUtc, DateTimeOffset EndUtc);
