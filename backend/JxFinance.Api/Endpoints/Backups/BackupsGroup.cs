using JxFinance.Common;
using JxFinance.Common.OpenApi;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Backups;

public sealed class BackupsGroup() : ApiGroup(ApiTags.Backups, role: AppRoles.Admin);
