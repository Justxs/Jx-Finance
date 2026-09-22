using FastEndpoints;

namespace JxFinance.Common;

public abstract class ApiGroup : Group
{
    protected ApiGroup(string tag, bool requiresAuthentication = true)
    {
        Configure(
            ApiRoutes.Prefix,
            ep => ep.Description(d =>
            {
                d.WithTags(tag).ProducesProblemDetails(400);
                if (requiresAuthentication) d.ProducesProblemDetails(401);
            }));
    }
}
