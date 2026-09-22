using JxFinance.Common;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Imports;

public sealed class ImportsGroup() : ApiGroup(ApiTags.Imports, Feature.Import);
