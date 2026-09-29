using System.Security.Claims;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Login;
using JxFinance.Endpoints.Auth.Passkeys;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Configuration;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

namespace JxFinance.Endpoints.Auth.Services;

[RegisterService<IPasskeyService>(LifeTime.Scoped)]
public sealed class PasskeyService(
    UserManager<AppUser> userManager,
    IPasskeyHandler<AppUser> handler,
    PasskeyStateCookie stateCookie,
    IAuthService authService,
    ISessionService sessionService,
    IHttpContextAccessor httpContextAccessor,
    IOptions<AppOptions> options,
    ILogger<PasskeyService> logger) : IPasskeyService
{
    private static readonly DomainError Unavailable = new(
        ErrorCodes.PasskeyUnavailable,
        "Passkeys need this installation to be opened over HTTPS by its domain name.");

    private static readonly DomainError StateInvalid = new(
        ErrorCodes.PasskeyStateInvalid,
        "The passkey request expired or was started elsewhere. Try again.");

    private static readonly DomainError Invalid = new(ErrorCodes.PasskeyInvalid, "The passkey could not be verified.");

    private static readonly DomainError LimitReached = new(
        ErrorCodes.PasskeyLimitReached,
        $"An account can hold at most {PasskeySite.MaxPasskeysPerUser} passkeys.");

    private static readonly DomainError UserMissing = EntityLookup.NotFound("The signed-in user no longer exists.");

    private HttpContext Http => httpContextAccessor.HttpContext
        ?? throw new InvalidOperationException("Passkey ceremonies run only during an HTTP request.");

    public async Task<Result<PasskeyOptionsResponse>> BeginRegistrationAsync(string password, CancellationToken cancellationToken)
    {
        if (!PasskeySite.IsAvailable(options.Value.SiteUrl))
        {
            return Unavailable;
        }

        var reauthenticated = await authService.ReauthenticateAsync(password, UserMissing, cancellationToken);
        if (!reauthenticated.TryGetValue(out var user))
        {
            return reauthenticated.Error;
        }

        if (await IsFullAsync(user))
        {
            return LimitReached;
        }

        var creation = await handler.MakeCreationOptionsAsync(
            new PasskeyUserEntity { Id = user.Id.ToString(), Name = user.Email!, DisplayName = user.DisplayName },
            Http);
        stateCookie.Write(PasskeyCeremony.Registration, creation.AttestationState!, user.Id, CurrentSessionId());
        return new PasskeyOptionsResponse(creation.CreationOptionsJson);
    }

    public async Task<Result<PasskeyResponse>> AddAsync(AddPasskeyRequest request, CancellationToken cancellationToken)
    {
        var state = stateCookie.Take(PasskeyCeremony.Registration);
        if (await authService.CurrentAsync(cancellationToken) is not { } user)
        {
            return UserMissing;
        }

        if (state is null || state.UserId != user.Id || state.SessionId != CurrentSessionId())
        {
            return StateInvalid;
        }

        if (await IsFullAsync(user))
        {
            return LimitReached;
        }

        var attestation = await handler.PerformAttestationAsync(new PasskeyAttestationContext
        {
            HttpContext = Http,
            CredentialJson = request.CredentialJson,
            AttestationState = state.State,
        });
        if (!attestation.Succeeded || attestation.UserEntity.Id != user.Id.ToString())
        {
            logger.LogInformation("A passkey registration was refused: {Reason}", attestation.Failure?.Message);
            return Invalid;
        }

        attestation.Passkey.Name = request.Name.Trim();
        await userManager.AddOrUpdatePasskeyAsync(user, attestation.Passkey);
        return ToResponse(attestation.Passkey);
    }

    public async Task<IReadOnlyList<PasskeyResponse>> ListAsync(CancellationToken cancellationToken) =>
        await authService.CurrentAsync(cancellationToken) is { } user
            ? (await userManager.GetPasskeysAsync(user)).OrderBy(p => p.CreatedAt).Select(ToResponse).ToList()
            : [];

    public async Task<Result<PasskeyResponse>> RenameAsync(RenamePasskeyRequest request, CancellationToken cancellationToken)
    {
        var found = await FindOwnAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var owned))
        {
            return found.Error;
        }

        owned.Passkey.Name = request.Name.Trim();
        await userManager.AddOrUpdatePasskeyAsync(owned.User, owned.Passkey);
        return ToResponse(owned.Passkey);
    }

    public async Task<Result> RemoveAsync(string id, CancellationToken cancellationToken)
    {
        var found = await FindOwnAsync(id, cancellationToken);
        if (!found.TryGetValue(out var owned))
        {
            return found.Error;
        }

        await userManager.RemovePasskeyAsync(owned.User, owned.Passkey.CredentialId);
        return Result.Success();
    }

    public async Task<Result<PasskeyOptionsResponse>> BeginSignInAsync()
    {
        if (!PasskeySite.IsAvailable(options.Value.SiteUrl))
        {
            return Unavailable;
        }

        var request = await handler.MakeRequestOptionsAsync(null, Http);
        stateCookie.Write(PasskeyCeremony.SignIn, request.AssertionState!);
        return new PasskeyOptionsResponse(request.RequestOptionsJson);
    }

    public async Task<Result<LoginResponse>> SignInAsync(PasskeySignInRequest request, CancellationToken cancellationToken)
    {
        if (stateCookie.Take(PasskeyCeremony.SignIn) is not { } state)
        {
            return StateInvalid;
        }

        var assertion = await handler.PerformAssertionAsync(new PasskeyAssertionContext
        {
            HttpContext = Http,
            CredentialJson = request.CredentialJson,
            AssertionState = state.State,
        });
        if (!assertion.Succeeded)
        {
            logger.LogInformation("A passkey sign-in was refused: {Reason}", assertion.Failure?.Message);
            return Invalid;
        }

        var user = assertion.User;
        if (user.IsDeactivated || user.PasswordHash is null)
        {
            return new DomainError(ErrorCodes.CredentialsInvalid, "Invalid email or password.");
        }

        await userManager.AddOrUpdatePasskeyAsync(user, assertion.Passkey);
        if (user.AccessFailedCount > 0)
        {
            await userManager.ResetAccessFailedCountAsync(user);
        }

        await sessionService.SignInAsync(user, request.RememberMe, cancellationToken);
        return new LoginResponse(false, await authService.ToProfileAsync(user));
    }

    private async Task<bool> IsFullAsync(AppUser user) =>
        (await userManager.GetPasskeysAsync(user)).Count >= PasskeySite.MaxPasskeysPerUser;

    private async Task<Result<OwnedPasskey>> FindOwnAsync(string id, CancellationToken cancellationToken)
    {
        var user = await authService.CurrentAsync(cancellationToken);
        var passkey = user is not null && Decode(id) is { } credentialId
            ? await userManager.GetPasskeyAsync(user, credentialId)
            : null;
        return user is null || passkey is null ? EntityLookup.NotFound("Passkey not found.") : new OwnedPasskey(user, passkey);
    }

    private Guid? CurrentSessionId() =>
        Guid.TryParse(Http.User.FindFirstValue(AuthClaims.SessionId), out var sessionId) ? sessionId : null;

    private static byte[]? Decode(string id)
    {
        try
        {
            return WebEncoders.Base64UrlDecode(id);
        }
        catch (FormatException)
        {
            return null;
        }
    }

    private static PasskeyResponse ToResponse(UserPasskeyInfo passkey) => new(
        WebEncoders.Base64UrlEncode(passkey.CredentialId),
        passkey.Name ?? string.Empty,
        passkey.CreatedAt,
        passkey.IsBackupEligible);

    private sealed record OwnedPasskey(AppUser User, UserPasskeyInfo Passkey);
}
