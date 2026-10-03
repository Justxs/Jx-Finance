using JxFinance.Common;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Payees;

public sealed class PayeesGroup() : ApiGroup(ApiTags.Payees, Feature.PayeeNames, tokenReadable: true);
