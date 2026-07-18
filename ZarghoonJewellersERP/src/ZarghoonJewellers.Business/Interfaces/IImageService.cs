using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Interfaces;

/// <summary>Manages the polymorphic Images table shared by Stock, Customers, Employees, Karigars
/// and Suppliers - lets the Stock module's multi-image gallery (upload, camera capture, set
/// primary, delete) work without any Stock-specific image plumbing.</summary>
public interface IImageService
{
    Task<IReadOnlyList<ImageAsset>> GetImagesAsync(string entityType, int entityId, CancellationToken cancellationToken = default);

    /// <summary>Stores a full-size image plus an auto-generated thumbnail. The first image added
    /// for an entity is automatically marked primary.</summary>
    Task<ImageAsset> AddImageAsync(string entityType, int entityId, string fileName, byte[] imageData, CancellationToken cancellationToken = default);

    Task SetPrimaryAsync(int imageId, CancellationToken cancellationToken = default);
    Task DeleteImageAsync(int imageId, CancellationToken cancellationToken = default);
}
