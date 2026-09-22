using FastEndpoints;
using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;

namespace JxFinance.Common;

public abstract class ApiGroup : Group
{
    protected ApiGroup(string tag, Feature? feature = null, bool requiresAuthentication = true)
    {
        Configure(
            ApiRoutes.Prefix,
            ep =>
            {
                ep.Description(d =>
                {
                    d.WithTags(tag).ProducesProblemDetails(400);
                    if (requiresAuthentication) d.ProducesProblemDetails(401);
                });
                if (feature is { } gated) ep.Options(b => b.WithMetadata(new RequiresFeature(gated)));
            });
    }
}
