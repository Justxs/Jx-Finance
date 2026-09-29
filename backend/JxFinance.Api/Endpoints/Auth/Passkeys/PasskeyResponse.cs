namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed record PasskeyResponse(string Id, string Name, DateTimeOffset CreatedAt, bool IsSynced);
