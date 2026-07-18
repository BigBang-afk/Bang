namespace ZarghoonJewellers.Domain.Entities;

/// <summary>
/// Polymorphic image store shared by Stock, Customers, Employees, Karigars and Suppliers.
/// Maps to the "Images" table; named <c>ImageAsset</c> in code to avoid clashing with
/// System.Drawing.Image used throughout the Presentation layer.
/// </summary>
public class ImageAsset
{
    public int ImageId { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public int EntityId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string? FilePath { get; set; }
    public byte[]? ImageData { get; set; }
    public byte[]? ThumbnailData { get; set; }
    public bool IsPrimary { get; set; }
    public DateTime UploadedDate { get; set; } = DateTime.Now;
}
