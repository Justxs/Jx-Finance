namespace JxFinance.Endpoints.Users.ResetUserPassword;

public sealed record ResetUserPasswordRequest(Guid Id, string NewPassword, string CurrentPassword, bool ResetTwoFactor = false);
