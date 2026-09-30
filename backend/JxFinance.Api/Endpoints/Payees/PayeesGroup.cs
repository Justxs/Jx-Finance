using JxFinance.Common;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.Payees;

public sealed class PayeesGroup() : ApiGroup(ApiTags.Payees, tokenReadable: true);
