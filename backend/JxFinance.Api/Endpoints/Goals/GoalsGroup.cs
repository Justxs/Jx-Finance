using JxFinance.Common;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Goals;

public sealed class GoalsGroup() : ApiGroup(ApiTags.Goals, Feature.Goals);
