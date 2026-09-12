using JxFinance.Endpoints.Auth.Shared;

namespace JxFinance.Endpoints.Auth.Login;

public sealed record LoginResponse(bool TwoFactorRequired, UserProfileResponse? Profile);
