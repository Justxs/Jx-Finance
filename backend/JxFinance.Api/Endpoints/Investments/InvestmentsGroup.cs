using JxFinance.Common;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Investments;

public sealed class InvestmentsGroup() : ApiGroup(ApiTags.Investments, Feature.Investments);
