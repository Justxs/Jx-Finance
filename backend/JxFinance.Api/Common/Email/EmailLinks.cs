using System.Text.Encodings.Web;
using FastEndpoints;
using JxFinance.Infrastructure.Configuration;
using Microsoft.Extensions.Options;

namespace JxFinance.Common.Email;

[RegisterService<IEmailLinks>(LifeTime.Scoped)]
public sealed class EmailLinks(IOptions<AppOptions> options) : IEmailLinks
{
    public string? PasswordReset(string email, string token) => Build("reset-password", email, token);

    public string? EmailVerification(string email, string token) => Build("verify-email", email, token);

    private string? Build(string path, string email, string token)
    {
        var siteUrl = options.Value.SiteUrl.Trim().TrimEnd('/');
        if (siteUrl.Length == 0)
        {
            return null;
        }

        var encoder = UrlEncoder.Default;
        return $"{siteUrl}/{path}?email={encoder.Encode(email)}&token={encoder.Encode(token)}";
    }
}
