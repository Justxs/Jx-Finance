using JxFinance.Common;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Attachments;

public sealed class AttachmentsGroup() : ApiGroup(ApiTags.Attachments, Feature.Attachments);
