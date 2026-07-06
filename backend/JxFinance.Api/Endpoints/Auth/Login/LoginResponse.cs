using JxFinance.Endpoints.Auth;

namespace JxFinance.Endpoints.Auth.Login;

public sealed record LoginResponse(bool TwoFactorRequired, UserProfileResponse? Profile);
