using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed record ChatSendResult(DomainError? Error, TimeSpan? RetryAfter = null, bool Gone = false);
