namespace JxFinance.Common.Email;

public interface IEmailLinks
{
    string PasswordReset(string email, string token);

    string EmailVerification(string email, string token);
}
