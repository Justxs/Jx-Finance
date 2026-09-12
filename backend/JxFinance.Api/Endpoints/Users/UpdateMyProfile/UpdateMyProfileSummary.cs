using FastEndpoints;

namespace JxFinance.Endpoints.Users.UpdateMyProfile;

public sealed class UpdateMyProfileSummary : Summary<UpdateMyProfileEndpoint, UpdateMyProfileRequest>
{
    public UpdateMyProfileSummary()
    {
        Summary = "Update your own profile";
        Description = "Changes your display name and, optionally, your password. A password change "
            + "needs the current password as well, and refreshes the session cookie so the browser stays "
            + "signed in. This is the one user endpoint that does not require the Admin role.";
        ExampleRequest = new UpdateMyProfileRequest("Justas", null, null);
        RequestParam(r => r.CurrentPassword, "Required only when newPassword is supplied.");
        RequestParam(r => r.NewPassword, "Omit to leave the password alone.");
        Responses[200] = "The updated profile.";
        Responses[400] = "Validation failed, or the current password was wrong.";
    }
}
