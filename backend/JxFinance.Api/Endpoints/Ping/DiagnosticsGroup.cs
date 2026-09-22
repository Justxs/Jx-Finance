using JxFinance.Common;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.Ping;

public sealed class DiagnosticsGroup() : ApiGroup(ApiTags.Diagnostics, requiresAuthentication: false);
