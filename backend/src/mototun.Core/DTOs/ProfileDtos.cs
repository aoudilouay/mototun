using mototun.Core.Enums;

namespace mototun.Core.DTOs;

public class MyProfileDto
{
    public int UserId { get; set; }
    public int ProfileId { get; set; }
    public UserRole Role { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Avatar { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public string TaxId { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? PostalCode { get; set; }
    public string? RegistrationNumber { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpdateMyProfileDto
{
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public string? Avatar { get; set; }
    public string? BusinessName { get; set; }
    public string? TaxId { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? RegistrationNumber { get; set; }
}
