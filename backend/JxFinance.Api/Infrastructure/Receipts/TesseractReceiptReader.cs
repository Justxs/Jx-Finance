using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using JxFinance.Common.Receipts;
using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Receipts;

public sealed class TesseractReceiptReader(ILogger<TesseractReceiptReader> logger) : IReceiptReader, IDisposable
{
    public const string Languages = "lit+eng";
    public const string PageSegmentation = "6";

    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(60);

    private readonly Lazy<string?> executable = new(FindExecutable);
    private readonly SemaphoreSlim running = new(1, 1);

    public bool IsAvailable => executable.Value is not null;

    public async Task<Result<string>> ReadTextAsync(byte[] image, CancellationToken cancellationToken)
    {
        if (executable.Value is not { } path)
        {
            return ReceiptErrors.EngineUnavailable;
        }

        await running.WaitAsync(cancellationToken);
        try
        {
            return await RunAsync(path, image, cancellationToken);
        }
        finally
        {
            running.Release();
        }
    }

    public void Dispose() => running.Dispose();

    private async Task<Result<string>> RunAsync(string path, byte[] image, CancellationToken cancellationToken)
    {
        var start = new ProcessStartInfo(path)
        {
            ArgumentList = { "stdin", "stdout", "-l", Languages, "--psm", PageSegmentation },
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
            UseShellExecute = false,
        };

        using var process = new Process { StartInfo = start };
        try
        {
            process.Start();
        }
        catch (Win32Exception ex)
        {
            logger.LogWarning("Tesseract could not be started: {Error}.", ex.Message);
            return ReceiptErrors.EngineUnavailable;
        }

        using var limit = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        limit.CancelAfter(Timeout);
        try
        {
            var output = process.StandardOutput.ReadToEndAsync(limit.Token);
            var errors = process.StandardError.ReadToEndAsync(limit.Token);
            await process.StandardInput.BaseStream.WriteAsync(image, limit.Token);
            process.StandardInput.Close();
            await process.WaitForExitAsync(limit.Token);
            if (process.ExitCode == 0)
            {
                return await output;
            }

            logger.LogWarning("Tesseract exited with {ExitCode}: {Error}", process.ExitCode, (await errors).Trim());
            return ReceiptErrors.EngineUnavailable;
        }
        catch (IOException ex)
        {
            process.Kill(entireProcessTree: true);
            logger.LogWarning("Tesseract stopped reading the image: {Error}.", ex.Message);
            return ReceiptErrors.EngineUnavailable;
        }
        catch (OperationCanceledException)
        {
            process.Kill(entireProcessTree: true);
            cancellationToken.ThrowIfCancellationRequested();
            logger.LogWarning("Tesseract did not finish reading a receipt within {Timeout}.", Timeout);
            return ReceiptErrors.Unreadable;
        }
    }

    private static string? FindExecutable()
    {
        var name = OperatingSystem.IsWindows() ? "tesseract.exe" : "tesseract";
        return (Environment.GetEnvironmentVariable("PATH") ?? string.Empty)
            .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries)
            .Select(folder => Path.Combine(folder, name))
            .FirstOrDefault(File.Exists);
    }
}
