using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Helpers;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

public class ImageService : IImageService
{
    private readonly IUnitOfWork _unitOfWork;

    public ImageService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<ImageAsset>> GetImagesAsync(string entityType, int entityId, CancellationToken cancellationToken = default)
        => (await _unitOfWork.Images.FindAsync(i => i.EntityType == entityType && i.EntityId == entityId, cancellationToken))
            .OrderByDescending(i => i.IsPrimary)
            .ThenBy(i => i.UploadedDate)
            .ToList();

    public async Task<ImageAsset> AddImageAsync(string entityType, int entityId, string fileName, byte[] imageData, CancellationToken cancellationToken = default)
    {
        var isFirstImage = !await _unitOfWork.Images.AnyAsync(i => i.EntityType == entityType && i.EntityId == entityId, cancellationToken);

        using var image = ImageHelper.FromBytes(imageData)
            ?? throw new Common.Exceptions.BusinessRuleException("The selected file is not a valid image.");

        var asset = new ImageAsset
        {
            EntityType = entityType,
            EntityId = entityId,
            FileName = fileName,
            ImageData = ImageHelper.ToJpegBytes(image),
            ThumbnailData = ImageHelper.GenerateThumbnail(image),
            IsPrimary = isFirstImage,
            UploadedDate = DateTime.Now
        };

        await _unitOfWork.Images.AddAsync(asset, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return asset;
    }

    public async Task SetPrimaryAsync(int imageId, CancellationToken cancellationToken = default)
    {
        var target = await _unitOfWork.Images.GetByIdAsync(imageId, cancellationToken)
            ?? throw new Common.Exceptions.BusinessRuleException("Image not found.");

        var siblings = await _unitOfWork.Images.FindAsync(
            i => i.EntityType == target.EntityType && i.EntityId == target.EntityId, cancellationToken);

        foreach (var sibling in siblings)
        {
            var shouldBePrimary = sibling.ImageId == imageId;
            if (sibling.IsPrimary != shouldBePrimary)
            {
                sibling.IsPrimary = shouldBePrimary;
                _unitOfWork.Images.Update(sibling);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteImageAsync(int imageId, CancellationToken cancellationToken = default)
    {
        var image = await _unitOfWork.Images.GetByIdAsync(imageId, cancellationToken);
        if (image is null) return;

        _unitOfWork.Images.Remove(image);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // If the deleted image was primary and others remain, promote the most recent one.
        if (image.IsPrimary)
        {
            var remaining = await _unitOfWork.Images.FindAsync(
                i => i.EntityType == image.EntityType && i.EntityId == image.EntityId, cancellationToken);
            var next = remaining.OrderByDescending(i => i.UploadedDate).FirstOrDefault();
            if (next is not null)
            {
                next.IsPrimary = true;
                _unitOfWork.Images.Update(next);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
        }
    }
}
