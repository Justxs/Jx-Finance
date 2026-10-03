using JxFinance.Domain.Notifications;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed record ChosenKinds(Guid UserId, List<NotificationType> Types);
