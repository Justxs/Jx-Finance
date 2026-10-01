using System.Linq.Expressions;
using JxFinance.Domain.Dashboard;
using JxFinance.Domain.Notifications;
using Microsoft.AspNetCore.Identity;

namespace JxFinance.Infrastructure.Auth;

public sealed class AppUser : IdentityUser<Guid>
{
    public static readonly DateTimeOffset DeactivatedUntil = DateTimeOffset.MaxValue;

    public static readonly Expression<Func<AppUser, bool>> IsNotDeactivated =
        u => u.LockoutEnd == null || u.LockoutEnd < DeactivatedUntil;

    public static readonly Expression<Func<AppUser, bool>> IsActive =
        u => u.PasswordHash != null && (u.LockoutEnd == null || u.LockoutEnd < DeactivatedUntil);

    public string DisplayName { get; set; } = string.Empty;

    public List<NotificationType> EmailNotificationTypes { get; set; } = [];

    public bool MonthlyDigestEverything { get; set; } = true;

    public List<Guid> MonthlyDigestHouseholdIds { get; set; } = [];

    public string? Language { get; set; }

    public DashboardLayout? DashboardLayout { get; set; }

    public bool CountOpenBalancesInNetWorth { get; set; }

    public bool IsDeactivated => LockoutEnd >= DeactivatedUntil;

    public bool CanSignIn => PasswordHash is not null && !IsDeactivated;

    public static string DisplayNameOrEmail(string? displayName, string? email) =>
        string.IsNullOrWhiteSpace(displayName) ? email ?? "" : displayName;
}
