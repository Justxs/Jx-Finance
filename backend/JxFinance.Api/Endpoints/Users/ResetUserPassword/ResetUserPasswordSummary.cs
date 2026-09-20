using FastEndpoints;

namespace JxFinance.Endpoints.Users.ResetUserPassword;

public sealed class ResetUserPasswordSummary : Summary<ResetUserPasswordEndpoint, ResetUserPasswordRequest>
{
    public ResetUserPasswordSummary()
    {
        Summary = "Set a new password for another user";
        Description = "Administrators only. For a user who forgot their password: the administrator chooses a "
            + "temporary password and hands it over outside the application, and the user changes it on their "
            + "profile after signing in. The administrator confirms the action with their own current password; "
            + "a wrong one answers password.incorrect, counts toward the administrator's sign-in lockout, and a "
            + "locked-out administrator answers credentials.lockedOut. The new password must satisfy the same "
            + "rules as any other password, otherwise password.tooWeak. Every session of the target user is "
            + "revoked and their failed sign-in counter and temporary lockout are cleared; a deactivated user "
            + "stays deactivated. With resetTwoFactor the authenticator is switched off and the recovery codes "
            + "are invalidated as well, for a user who also lost their device. The target may be a member or "
            + "another administrator, never the caller: change your own password on the profile. Rate limited "
            + "to 10 calls per five minutes per client.";
        ExampleRequest = new ResetUserPasswordRequest(Guid.Empty, "Temporary-Password-123!", "correct horse battery staple", false);
        Params["id"] = "The user id. Takes precedence over the id in the body.";
        RequestParam(r => r.NewPassword, "The temporary password for the user, 8 to 100 characters.");
        RequestParam(r => r.CurrentPassword, "The current password of the signed-in administrator.");
        RequestParam(r => r.ResetTwoFactor, "Also switch off two-factor authentication and invalidate the recovery codes. Default false.");
        Responses[200] = "The profile of the user after the reset.";
        Responses[400] = "The administrator's password is wrong, or the new password is missing or too weak.";
        Responses[403] = "The signed-in user is not an administrator, or is the target.";
        Responses[404] = "No such user.";
        Responses[429] = "Too many attempts or too many wrong passwords; wait and retry.";
    }
}
