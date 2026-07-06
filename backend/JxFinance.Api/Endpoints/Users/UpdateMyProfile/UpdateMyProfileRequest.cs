namespace JxFinance.Endpoints.Users.UpdateMyProfile;

public sealed record UpdateMyProfileRequest(string DisplayName, string? CurrentPassword, string? NewPassword);
