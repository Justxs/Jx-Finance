using JxFinance.Common;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Auth.Tokens;

public sealed class ApiTokensGroup() : ApiGroup(ApiTags.Auth, Feature.ApiTokens);
