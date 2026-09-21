using System.Text.Encodings.Web;
using FastEndpoints;
using JxFinance.Infrastructure.Configuration;
using Microsoft.Extensions.Options;

namespace JxFinance.Common.Email;

[RegisterService<IEmailLinks>(LifeTime.Scoped)]
public sealed class EmailLinks(IOptions<AppOptions> options, IHttpContextAccessor accessor) : IEmailLinks
{
    public string PasswordReset(string email, string token) => Build("reset-password", email, token);

    public string EmailVerification(string email, string token) => Build("verify-email", email, token);

    private string Build(string path, string email, string token)
    {
        var encoder = UrlEncoder.Default;
        return $"{BaseUrl()}/{path}?email={encoder.Encode(email)}&token={encoder.Encode(token)}";
    }

    private string BaseUrl()
    {
        var configured = options.Value.SiteUrl.Trim().TrimEnd('/');
        if (configured.Length > 0)
        {
            return configured;
        }

        var request = accessor.HttpContext?.Request;
        return request is null ? string.Empty : $"{request.Scheme}://{request.Host}";
    }
}
