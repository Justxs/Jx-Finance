using System.Net.Mime;
using System.Text;
using FastEndpoints;

namespace JxFinance.Common;

public static class DownloadResponse
{
    private const int BufferSize = 16 * 1024;

    public static Stream StartDownload(this HttpContext context, string fileName, string contentType)
    {
        context.MarkResponseStart();
        context.Response.StatusCode = StatusCodes.Status200OK;
        context.Response.ContentType = contentType;
        context.Response.Headers.ContentDisposition = $"attachment; filename={fileName}";
        return context.Response.Body;
    }

    public static StreamWriter StartCsv(this HttpContext context, string fileName) =>
        new(context.StartDownload(fileName, MediaTypeNames.Text.Csv), new UTF8Encoding(false), BufferSize, leaveOpen: true);
}
