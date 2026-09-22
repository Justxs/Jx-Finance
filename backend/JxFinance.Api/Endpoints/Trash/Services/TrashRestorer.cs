using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Trash.Services;

public sealed record TrashRestorer(
    Feature? Feature,
    Func<TrashRestore, Task<EntityBase?>> Load,
    Func<TrashRestore, EntityBase, Task<Result>> Check,
    Func<TrashRestore, EntityBase, Task<Result>> Restore,
    bool UsesChanges);
