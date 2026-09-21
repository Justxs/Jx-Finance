using FastEndpoints;

namespace JxFinance.Endpoints.Users.UpdateMyProfile;

public sealed class UpdateMyProfileSummary : Summary<UpdateMyProfileEndpoint, UpdateMyProfileRequest>
{
    public UpdateMyProfileSummary()
    {
        Summary = "Update your own profile";
        Description = "Changes your display name, your bill reminder email preference and, optionally, your password. "
            + "A password change needs the current password as well, and refreshes the session cookie so the browser "
            + "stays signed in. This is the one user endpoint that does not require the Admin role.";
        ExampleRequest = new UpdateMyProfileRequest("Justas", null, null, false);
        RequestParam(r => r.CurrentPassword, "Required only when newPassword is supplied.");
        RequestParam(r => r.NewPassword, "Omit to leave the password alone.");
        RequestParam(
            r => r.BillReminderEmails,
            "Send a reminder email beside the in-app notification of a recurring entry. Off by default, and it needs "
                + "both a working mail server and a confirmed address to have any effect.");
        Responses[200] = "The updated profile.";
        Responses[400] = "Validation failed, or the current password was wrong.";
    }
}
