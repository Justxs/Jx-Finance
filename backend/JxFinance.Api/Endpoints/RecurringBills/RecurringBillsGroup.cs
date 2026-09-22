using JxFinance.Common;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.RecurringBills;

public sealed class RecurringBillsGroup() : ApiGroup(ApiTags.RecurringBills, Feature.RecurringBills);
