using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Email;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Email;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JxFinance.Endpoints.Auth.Services;

[RegisterService<IAccountEmailService>(LifeTime.Scoped)]
public sealed class AccountEmailService(
    UserManager<AppUser> userManager,
    IEmailOutbox outbox,
    IEmailLinks links,
    IInstanceSettingsStore store,
    IOptions<AppOptions> options,
    AppDbContext db,
    ILogger<AccountEmailService> logger) : IAccountEmailService
{
    private static readonly DomainError ResetTokenInvalid = new(
        ErrorCodes.PasswordResetTokenInvalid,
        "This link is no longer valid. Ask for a new one.");

    public async Task RequestPasswordResetAsync(string email, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null || user.PasswordHash is null || user.IsDeactivated)
        {
            logger.LogInformation("A password reset was asked for an address that cannot receive one.");
            return;
        }

        var settings = store.Current;
        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        await outbox.EnqueueAndSaveAsync(
            EmailKind.PasswordReset,
            EmailTexts.PasswordReset(
                settings.DefaultLanguage,
                user.Email!,
                user.DisplayName,
                links.PasswordReset(user.Email!, token),
                options.Value.Email.PasswordResetMinutes,
                EmailTexts.Product(settings.InstanceName)),
            cancellationToken);
    }

    public async Task<Result> ResetPasswordAsync(
        string email,
        string token,
        string newPassword,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null || user.PasswordHash is null || user.IsDeactivated)
        {
            return ResetTokenInvalid;
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var result = await userManager.ResetPasswordAsync(user, token, newPassword);
        if (!result.Succeeded)
        {
            return result.Errors.Any(e => e.Code == nameof(IdentityErrorDescriber.InvalidToken))
                ? ResetTokenInvalid
                : result.ToDomainError();
        }

        if (!user.IsDeactivated)
        {
            await userManager.SetLockoutEndDateAsync(user, null);
        }

        await userManager.ResetAccessFailedCountAsync(user);
        await userManager.UpdateSecurityStampAsync(user);
        await transaction.CommitAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result> SendVerificationAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await userManager.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user?.Email is null)
        {
            return EntityLookup.NotFound("User not found.");
        }

        if (user.EmailConfirmed)
        {
            return new DomainError(ErrorCodes.EmailAlreadyVerified, "This address is already confirmed.");
        }

        var settings = store.Current;
        if (!store.Current.Smtp.IsConfigured)
        {
            return new DomainError(
                ErrorCodes.EmailNotConfigured,
                "This installation cannot send email yet. Ask an administrator to set up the mail server.");
        }

        var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
        await outbox.EnqueueAndSaveAsync(
            EmailKind.EmailVerification,
            EmailTexts.Verification(
                settings.DefaultLanguage,
                user.Email,
                user.DisplayName,
                links.EmailVerification(user.Email, token),
                EmailTexts.Product(settings.InstanceName)),
            cancellationToken);

        return Result.Success();
    }

    public async Task<Result> ConfirmEmailAsync(string email, string token, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            return new DomainError(ErrorCodes.EmailTokenInvalid, "This link is no longer valid. Ask for a new one.");
        }

        if (user.EmailConfirmed)
        {
            return Result.Success();
        }

        var result = await userManager.ConfirmEmailAsync(user, token);
        return result.Succeeded
            ? Result.Success()
            : new DomainError(ErrorCodes.EmailTokenInvalid, "This link is no longer valid. Ask for a new one.");
    }
}
