using FastEndpoints;
using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;

namespace JxFinance.Common;

public abstract class ApiGroup : Group
{
    protected ApiGroup(
        string tag,
        Feature? feature = null,
        bool requiresAuthentication = true,
        string? role = null,
        bool tokenReadable = false)
    {
        List<object> metadata = [];
        if (feature is { } gated) metadata.Add(new RequiresFeature(gated));
        if (tokenReadable) metadata.Add(TokenReadable.Yes);

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
                if (metadata.Count > 0) ep.Options(b => b.WithMetadata([.. metadata]));
            });
    }
}
