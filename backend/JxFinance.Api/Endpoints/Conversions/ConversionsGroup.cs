using JxFinance.Common;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Conversions;

public sealed class ConversionsGroup() : ApiGroup(ApiTags.Conversions, Feature.MultiCurrency);
