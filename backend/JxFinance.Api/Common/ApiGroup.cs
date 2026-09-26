using FastEndpoints;
using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;

namespace JxFinance.Common;

public abstract class ApiGroup : Group
{
    protected ApiGroup(string tag, Feature? feature = null, bool requiresAuthentication = true, string? role = null)
    {
        Configure(
            ApiRoutes.Prefix,
            ep =>
            {
                ep.Description(d =>
                {
                    d.WithTags(tag).ProducesProblemDetails(400);
                    if (requiresAuthentication) d.ProducesProblemDetails(401);
                    if (role is not null) d.ProducesProblemDetails(403);
                });
                if (role is not null) ep.Roles(role);
                if (feature is { } gated) ep.Options(b => b.WithMetadata(new RequiresFeature(gated)));
            });
    }
}
