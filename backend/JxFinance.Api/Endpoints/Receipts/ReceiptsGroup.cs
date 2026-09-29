using JxFinance.Common;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Receipts;

public sealed class ReceiptsGroup() : ApiGroup(ApiTags.Receipts, Feature.ReceiptReading);
