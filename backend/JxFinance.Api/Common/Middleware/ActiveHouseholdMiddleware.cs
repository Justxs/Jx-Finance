using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Middleware;

public sealed class ActiveHouseholdMiddleware(RequestDelegate next, IInstanceSettingsStore settings)
{
    public async Task InvokeAsync(HttpContext context, AppDbContext db, ICurrentUser currentUser)
    {
        if (!TryRequested(context, out var requested))
        {
            await RefuseAsync(context);
            return;
        }

        if (requested is not null && settings.Current.IsEnabled(Feature.Households))
        {
            var userId = currentUser.Id;
            var householdId = requested.Value;
            var isMember = await db.HouseholdMemberships
                .AnyAsync(m => m.HouseholdId == householdId && m.UserId == userId, context.RequestAborted);
            if (isMember)
            {
                context.Items[ActiveHousehold.ItemKey] = householdId;
            }
        }

        await next(context);
    }

    private static bool TryRequested(HttpContext context, out HouseholdId? requested)
    {
        requested = null;
        if (context.User.Identity?.IsAuthenticated is not true)
        {
            return true;
        }

        var header = context.Request.Headers[ActiveHousehold.HeaderName].ToString();
        var query = ActiveHousehold.TakesQueryScope(context.Request.Path)
            ? context.Request.Query[ActiveHousehold.QueryName].ToString()
            : string.Empty;

        if (header.Length > 0 && query.Length > 0 && !header.Equals(query, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var asked = header.Length > 0 ? header : query;
        requested = Guid.TryParse(asked, out var parsed) && parsed != Guid.Empty ? new HouseholdId(parsed) : null;
        return true;
    }

    private static Task RefuseAsync(HttpContext context)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return context.Response.WriteAsJsonAsync(
            new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Conflicting active household",
                Detail =
                    $"The {ActiveHousehold.HeaderName} header and the {ActiveHousehold.QueryName} query parameter name two different households.",
                Instance = context.Request.Path,
                Extensions = { ["code"] = ErrorCodes.HouseholdScopeMismatch },
            },
            options: null,
            contentType: "application/problem+json",
            context.RequestAborted);
    }
}
