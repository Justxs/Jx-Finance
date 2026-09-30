namespace JxFinance.Endpoints.Users.ImportMyData;

public sealed class ImportMyDataRequest
{
    public IFormFile File { get; set; } = default!;
}
