using JxFinance.Common;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class SetupGroup() : ApiGroup(ApiTags.Setup, requiresAuthentication: false);
