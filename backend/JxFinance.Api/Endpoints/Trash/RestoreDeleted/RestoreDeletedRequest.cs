using System.Text.Json.Serialization;
using JxFinance.Domain.Trash;

namespace JxFinance.Endpoints.Trash.RestoreDeleted;

public sealed record RestoreDeletedRequest([property: JsonRequired] TrashKind Kind, Guid EntityId);
