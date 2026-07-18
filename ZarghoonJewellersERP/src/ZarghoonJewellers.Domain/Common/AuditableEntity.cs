namespace ZarghoonJewellers.Domain.Common;

/// <summary>
/// Marker base class for entities that expose a <see cref="CreatedDate"/>.
/// Kept intentionally minimal - EF Core maps derived entities directly and
/// the repository layer relies on this only to stamp timestamps on insert.
/// </summary>
public abstract class AuditableEntity
{
    public DateTime CreatedDate { get; set; } = DateTime.Now;
}
