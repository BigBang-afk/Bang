namespace ZarghoonJewellers.Domain.Entities;

/// <summary>An immutable record of a security-relevant or data-changing action, written by
/// ZarghoonJewellers.Common.Logging.AuditLogger and never updated or deleted by the application.</summary>
public class AuditLog
{
    public long AuditLogId { get; set; }
    public int? UserId { get; set; }
    public string ActionType { get; set; } = string.Empty; // Insert/Update/Delete/Login/Logout
    public string? TableName { get; set; }
    public string? RecordId { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? IPAddress { get; set; }
    public DateTime ActionDate { get; set; } = DateTime.Now;

    public User? User { get; set; }
}
