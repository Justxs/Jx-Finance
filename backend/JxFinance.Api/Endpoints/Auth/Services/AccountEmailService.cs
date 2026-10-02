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

    private static readonly DomainError EmailTokenInvalid = new(
        ErrorCodes.EmailTokenInvalid,
        "This link is no longer valid. Ask for a new one.");

    public async Task RequestPasswordResetAsync(string email, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is not { CanSignIn: true })
        {
            logger.LogInformation("A password reset was asked for an address that cannot receive one.");
            return;
        }

        var settings = store.Current;
        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        if (links.PasswordReset(user.Email!, token) is not { } link)
        {
            logger.LogWarning("A password reset link was not sent because App:SiteUrl is not set.");
            return;
        }

        await outbox.EnqueueAndSaveAsync(
            EmailKind.PasswordReset,
            EmailTexts.PasswordReset(
                user.Language ?? settings.DefaultLanguage,
                user.Email!,
                user.DisplayName,
                link,
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
        if (user is not { CanSignIn: true })
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

        await PasswordReset.CompleteAsync(userManager, db, user, cancellationToken);
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
        if (links.EmailVerification(user.Email, token) is not { } link)
        {
            logger.LogWarning("An email verification link was not sent because App:SiteUrl is not set.");
            return new DomainError(
                ErrorCodes.EmailNotConfigured,
                "This installation has no site address for the link yet. Ask an administrator to set App:SiteUrl.");
        }

        await outbox.EnqueueAndSaveAsync(
            EmailKind.EmailVerification,
            EmailTexts.Verification(
                user.Language ?? settings.DefaultLanguage,
                user.Email,
                user.DisplayName,
                link,
                EmailTexts.Product(settings.InstanceName)),
            cancellationToken);

        return Result.Success();
    }

    public async Task<Result> ConfirmEmailAsync(string email, string token, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            return EmailTokenInvalid;
        }

        if (user.EmailConfirmed)
        {
            return Result.Success();
        }

        var result = await userManager.ConfirmEmailAsync(user, token);
        return result.Succeeded
            ? Result.Success()
            : EmailTokenInvalid;
    }
}
