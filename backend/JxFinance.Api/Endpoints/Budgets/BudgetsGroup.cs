using JxFinance.Common;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Budgets;

public sealed class BudgetsGroup() : ApiGroup(ApiTags.Budgets, Feature.Budgets);
