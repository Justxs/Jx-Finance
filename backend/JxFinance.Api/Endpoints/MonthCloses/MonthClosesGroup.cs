using JxFinance.Common;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.MonthCloses;

public sealed class MonthClosesGroup() : ApiGroup(ApiTags.MonthClose, Feature.MonthClose);
