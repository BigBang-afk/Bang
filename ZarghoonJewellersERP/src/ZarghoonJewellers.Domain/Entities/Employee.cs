namespace ZarghoonJewellers.Domain.Entities;

/// <summary>Staff member record; optionally linked to a login <see cref="User"/>.</summary>
public class Employee
{
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Designation { get; set; }
    public string? Department { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? CNIC { get; set; }
    public DateOnly? JoiningDate { get; set; }
    public decimal Salary { get; set; }
    public int? UserId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    public User? User { get; set; }
}
