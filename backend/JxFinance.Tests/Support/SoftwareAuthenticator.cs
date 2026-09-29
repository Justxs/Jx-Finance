using System.Buffers.Binary;
using System.Buffers.Text;
using System.Formats.Cbor;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace JxFinance.Tests.Support;

public sealed class SoftwareAuthenticator : IDisposable
{
    private const byte UserPresent = 0x01;
    private const byte UserVerified = 0x04;
    private const byte BackupEligible = 0x08;
    private const byte AttestedCredentialData = 0x40;

    private static readonly string[] Transports = ["internal"];

    private readonly ECDsa key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
    private string? userHandle;

    public byte[] CredentialId { get; } = RandomNumberGenerator.GetBytes(16);

    public string Id => Base64Url.EncodeToString(CredentialId);

    public string Origin { get; set; } = ApiFixture.SiteUrl;

    public string RpId { get; set; } = new Uri(ApiFixture.SiteUrl).Host;

    public uint SignCount { get; set; }

    public bool Synced { get; init; } = true;

    public bool BreakSignature { get; set; }

    public async Task<HttpResponseMessage> RegisterAsync(HttpClient client, string password, string name = "Test key")
    {
        var options = await ReadOptionsAsync(await client.PostAsJsonAsync(
            "/api/auth/passkeys/registration-options",
            new { password },
            TestContext.Current.CancellationToken));
        return await client.PostAsJsonAsync(
            "/api/auth/passkeys",
            new { credentialJson = Create(options), name },
            TestContext.Current.CancellationToken);
    }

    public async Task<HttpResponseMessage> SignInAsync(HttpClient client, bool rememberMe = false)
    {
        var options = await ReadOptionsAsync(await client.PostAsync(
            "/api/auth/passkeys/sign-in-options",
            null,
            TestContext.Current.CancellationToken));
        return await client.PostAsJsonAsync(
            "/api/auth/passkeys/sign-in",
            new { credentialJson = Get(options), rememberMe },
            TestContext.Current.CancellationToken);
    }

    public string Create(string optionsJson)
    {
        var options = JsonNode.Parse(optionsJson)!;
        userHandle = options["user"]!["id"]!.GetValue<string>();
        var clientData = ClientData("webauthn.create", options["challenge"]!.GetValue<string>());
        var writer = new CborWriter();
        writer.WriteStartMap(3);
        writer.WriteTextString("fmt");
        writer.WriteTextString("none");
        writer.WriteTextString("attStmt");
        writer.WriteStartMap(0);
        writer.WriteEndMap();
        writer.WriteTextString("authData");
        writer.WriteByteString(AuthenticatorData(AttestedCredentialData, CredentialData()));
        writer.WriteEndMap();

        return JsonSerializer.Serialize(new
        {
            id = Id,
            rawId = Id,
            type = "public-key",
            response = new
            {
                clientDataJSON = Base64Url.EncodeToString(clientData),
                attestationObject = Base64Url.EncodeToString(writer.Encode()),
                transports = Transports,
            },
            clientExtensionResults = new { },
        });
    }

    public string Get(string optionsJson)
    {
        var options = JsonNode.Parse(optionsJson)!;
        var clientData = ClientData("webauthn.get", options["challenge"]!.GetValue<string>());
        SignCount++;
        var authenticatorData = AuthenticatorData(0, []);
        var signature = key.SignData(
            [.. authenticatorData, .. SHA256.HashData(clientData)],
            HashAlgorithmName.SHA256,
            DSASignatureFormat.Rfc3279DerSequence);
        if (BreakSignature)
        {
            signature[^1] ^= 0xFF;
        }

        return JsonSerializer.Serialize(new
        {
            id = Id,
            rawId = Id,
            type = "public-key",
            response = new
            {
                clientDataJSON = Base64Url.EncodeToString(clientData),
                authenticatorData = Base64Url.EncodeToString(authenticatorData),
                signature = Base64Url.EncodeToString(signature),
                userHandle,
            },
            clientExtensionResults = new { },
        });
    }

    public void Dispose() => key.Dispose();

    private static async Task<string> ReadOptionsAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.True(response.IsSuccessStatusCode, $"{(int)response.StatusCode}: {body}");
        return JsonNode.Parse(body)!["optionsJson"]!.GetValue<string>();
    }

    private byte[] ClientData(string type, string challenge) =>
        Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { type, challenge, origin = Origin, crossOrigin = false }));

    private byte[] AuthenticatorData(byte extraFlags, byte[] credentialData)
    {
        var counter = new byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(counter, SignCount);
        var flags = (byte)(UserPresent | UserVerified | extraFlags | (Synced ? BackupEligible : 0));
        return [.. SHA256.HashData(Encoding.UTF8.GetBytes(RpId)), flags, .. counter, .. credentialData];
    }

    private byte[] CredentialData()
    {
        var point = key.ExportParameters(false).Q;
        var cose = new CborWriter();
        cose.WriteStartMap(5);
        cose.WriteInt32(1);
        cose.WriteInt32(2);
        cose.WriteInt32(3);
        cose.WriteInt32(-7);
        cose.WriteInt32(-1);
        cose.WriteInt32(1);
        cose.WriteInt32(-2);
        cose.WriteByteString(point.X!);
        cose.WriteInt32(-3);
        cose.WriteByteString(point.Y!);
        cose.WriteEndMap();

        var length = new byte[2];
        BinaryPrimitives.WriteUInt16BigEndian(length, (ushort)CredentialId.Length);
        return [.. new byte[16], .. length, .. CredentialId, .. cose.Encode()];
    }
}
