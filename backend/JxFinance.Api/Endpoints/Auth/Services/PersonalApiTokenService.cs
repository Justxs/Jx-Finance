using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Tokens;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Auth.Services;

[RegisterService<IPersonalApiTokenService>(LifeTime.Scoped)]
public sealed class PersonalApiTokenService(
    IAuthService authService,
    ICurrentUser currentUser,
    AppDbContext db,
    IClock clock) : IPersonalApiTokenService
{
    private static readonly DomainError LimitReached = new(
        ErrorCodes.TokenLimitReached,
        $"An account can hold at most {PersonalApiToken.MaxActivePerUser} tokens that have not expired.");

    private static readonly DomainError UserMissing = EntityLookup.NotFound("The signed-in user no longer exists.");

    public async Task<IReadOnlyList<PersonalApiTokenResponse>> ListAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.Id;
        var now = clock.UtcNow;
        return await db.PersonalApiTokens
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new PersonalApiTokenResponse(t.Id, t.Name, t.Prefix, t.CreatedAt, t.ExpiresAt, t.LastUsedAt, t.ExpiresAt <= now))
            .ToListAsync(cancellationToken);
    }

    public async Task<Result<CreatedPersonalApiTokenResponse>> CreateAsync(
        CreatePersonalApiTokenRequest request,
        CancellationToken cancellationToken)
    {
        var reauthenticated = await authService.ReauthenticateAsync(request.Password, ErrorCodes.PasswordIncorrect, UserMissing, cancellationToken);
        if (!reauthenticated.TryGetValue(out var user))
        {
            return reauthenticated.Error;
        }

        var now = clock.UtcNow;
        if (await db.PersonalApiTokens.CountAsync(t => t.UserId == user.Id && t.ExpiresAt > now, cancellationToken)
            >= PersonalApiToken.MaxActivePerUser)
        {
            return LimitReached;
        }

        var issued = PersonalApiTokenFormat.Issue();
        var token = new PersonalApiToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = request.Name.Trim(),
            Prefix = issued.Prefix,
            SecretHash = issued.SecretHash,
            CreatedAt = now,
            ExpiresAt = now.AddDays(request.ExpiresInDays),
        };
        db.PersonalApiTokens.Add(token);
        await db.SaveChangesAsync(cancellationToken);

        return new CreatedPersonalApiTokenResponse(token.Id, token.Name, token.Prefix, token.CreatedAt, token.ExpiresAt, issued.Token);
    }

    public async Task<Result<Guid>> RevokeAsync(Guid id, CancellationToken cancellationToken)
    {
        var userId = currentUser.Id;
        var deleted = await db.PersonalApiTokens.Where(t => t.Id == id && t.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        return deleted == 0 ? EntityLookup.NotFound("Token not found.") : id;
    }
}
