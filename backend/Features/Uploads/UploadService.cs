using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace JuvicClinic.Api.Features.Uploads;

public record UploadedAsset(string Url, string PublicId, string MimeType, string OriginalName, long Size, string ResourceType);

public sealed class UploadService(HttpClient http, IConfiguration config)
{
    private readonly string cloudName = config["Cloudinary:CloudName"] ?? "";
    private readonly string apiKey = config["Cloudinary:ApiKey"] ?? "";
    private readonly string apiSecret = config["Cloudinary:ApiSecret"] ?? "";

    public async Task<UploadedAsset> UploadAsync(IFormFile file, string folder, CancellationToken ct)
    {
        if (file.Length == 0) throw new ArgumentException("Choose a file to upload.");
        if (file.Length > 10 * 1024 * 1024) throw new ArgumentException("The file cannot exceed 10 MB.");
        var isImage = file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);
        var isPdf = string.Equals(file.ContentType, "application/pdf", StringComparison.OrdinalIgnoreCase);
        if (!isImage && !isPdf) throw new ArgumentException("Only images and PDF documents are supported.");
        if (string.IsNullOrWhiteSpace(cloudName) || string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(apiSecret))
            throw new InvalidOperationException("Cloudinary is not configured. Set Cloudinary__CloudName, Cloudinary__ApiKey and Cloudinary__ApiSecret.");

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        var safeFolder = $"juvic-clinic/{Sanitize(folder)}";
        var parameters = new SortedDictionary<string, string>(StringComparer.Ordinal) { ["folder"] = safeFolder, ["timestamp"] = timestamp };
        if (isImage) parameters["transformation"] = "c_limit,w_1600,h_1600,q_auto:good";
        var signatureBase = string.Join("&", parameters.Select(x => $"{x.Key}={x.Value}")) + apiSecret;
        var signature = Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes(signatureBase))).ToLowerInvariant();

        using var form = new MultipartFormDataContent();
        await using var stream = file.OpenReadStream();
        using var fileContent = new StreamContent(stream);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(file.ContentType);
        form.Add(fileContent, "file", file.FileName);
        var resourceType = isImage ? "image" : "raw";
        var query = $"api_key={Uri.EscapeDataString(apiKey)}&timestamp={Uri.EscapeDataString(timestamp)}&folder={Uri.EscapeDataString(safeFolder)}&signature={Uri.EscapeDataString(signature)}";
        if (isImage) query += $"&transformation={Uri.EscapeDataString(parameters["transformation"])}";
        using var response = await http.PostAsync($"https://api.cloudinary.com/v1_1/{cloudName}/{resourceType}/upload?{query}", form, ct);
        var payload = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException($"Cloudinary upload failed: {payload}");
        using var json = JsonDocument.Parse(payload);
        var root = json.RootElement;
        return new UploadedAsset(root.GetProperty("secure_url").GetString()!, root.GetProperty("public_id").GetString()!, file.ContentType, file.FileName, root.TryGetProperty("bytes", out var bytes) ? bytes.GetInt64() : file.Length, resourceType);
    }

    private static string Sanitize(string value) => string.Concat((value ?? "documents").ToLowerInvariant().Select(c => char.IsLetterOrDigit(c) || c is '-' or '_' ? c : '-')).Trim('-');
}
