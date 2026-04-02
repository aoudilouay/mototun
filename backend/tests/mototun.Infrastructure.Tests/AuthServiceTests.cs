using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using mototun.Core.DTOs.Auth;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Core.Exceptions;
using mototun.Infrastructure.Data;
using mototun.Infrastructure.Services;

namespace mototun.Infrastructure.Tests;

public class AuthServiceTests
{
    [Fact]
    public async Task RegisterAsync_ShouldRejectAdminRole()
    {
        using var context = BuildContext();
        var service = BuildService(context);

        var dto = BuildRegisterDto(UserRole.Admin);

        var exception = await Assert.ThrowsAsync<AuthValidationException>(() => service.RegisterAsync(dto));

        Assert.Contains("restricted", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RegisterAsync_ShouldRejectWeakPassword()
    {
        using var context = BuildContext();
        var service = BuildService(context);
        var dto = BuildRegisterDto(UserRole.Revendeur);
        dto.Password = "weakpass";

        var exception = await Assert.ThrowsAsync<AuthValidationException>(() => service.RegisterAsync(dto));

        Assert.Contains("Password", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RegisterAsync_ShouldReturnSafeProfileWithoutPasswordHash()
    {
        using var context = BuildContext();
        var service = BuildService(context);

        var response = await service.RegisterAsync(BuildRegisterDto(UserRole.Revendeur));
        var profileJson = JsonSerializer.Serialize(response.Profile);

        Assert.Equal("Revendeur", response.Role);
        Assert.NotNull(response.Profile);
        Assert.DoesNotContain("\"passwordHash\":", profileJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("\"user\":", profileJson, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task LoginAsync_ShouldReturnSafeProfileWithoutPasswordHash()
    {
        using var context = BuildContext();
        var now = DateTime.UtcNow;

        var user = new User
        {
            Email = "login.rev@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("P@ssw0rd!1"),
            FullName = "Login Revendeur",
            Role = UserRole.Revendeur,
            Status = UserStatus.Active,
            CreatedAt = now,
            UpdatedAt = now
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        context.Revendeurs.Add(new Revendeur
        {
            UserId = user.Id,
            BusinessName = "Login Motors",
            TaxId = "TAX-LOGIN-001",
            Address = "Rue Login",
            City = "Tunis",
            PostalCode = "1000",
            CreatedAt = now
        });
        await context.SaveChangesAsync();

        var service = BuildService(context);
        var response = await service.LoginAsync(new LoginDto
        {
            Email = user.Email,
            Password = "P@ssw0rd!1"
        });
        var profileJson = JsonSerializer.Serialize(response.Profile);

        Assert.Equal("Revendeur", response.Role);
        Assert.False(string.IsNullOrWhiteSpace(response.Token));
        Assert.DoesNotContain("\"passwordHash\":", profileJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("\"user\":", profileJson, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task LoginAsync_ShouldRejectWhenCanLoginIsFalse()
    {
        using var context = BuildContext();
        var now = DateTime.UtcNow;

        var user = new User
        {
            Email = "blocked.login@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("P@ssw0rd!1"),
            FullName = "Blocked User",
            Role = UserRole.Revendeur,
            Status = UserStatus.Active,
            CanLogin = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = BuildService(context);
        var exception = await Assert.ThrowsAsync<AuthAuthenticationException>(() => service.LoginAsync(new LoginDto
        {
            Email = user.Email,
            Password = "P@ssw0rd!1"
        }));

        Assert.Contains("Invalid email or password", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task LoginAsync_ShouldLockAccountAfterTooManyFailures()
    {
        using var context = BuildContext();
        var now = DateTime.UtcNow;
        var user = new User
        {
            Email = "lockout@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("GoodP@ssw0rd1"),
            FullName = "Lockout User",
            Role = UserRole.Revendeur,
            Status = UserStatus.Active,
            CanLogin = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = BuildService(context);

        for (var i = 0; i < 5; i++)
        {
            await Assert.ThrowsAsync<AuthAuthenticationException>(() => service.LoginAsync(new LoginDto
            {
                Email = user.Email,
                Password = "WrongPassword!1"
            }));
        }

        var updatedUser = await context.Users.FirstAsync(u => u.Id == user.Id);
        Assert.NotNull(updatedUser.LockoutEndAt);
        Assert.True(updatedUser.LockoutEndAt > DateTime.UtcNow);
        Assert.Equal(0, updatedUser.FailedLoginAttempts);
    }

    [Fact]
    public async Task PreparePasswordResetAsync_ShouldStoreHashAndExpiry()
    {
        using var context = BuildContext();
        var now = DateTime.UtcNow;
        var user = new User
        {
            Email = "reset@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldP@ssw0rd1"),
            FullName = "Reset User",
            Role = UserRole.Revendeur,
            Status = UserStatus.Active,
            CanLogin = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = BuildService(context);
        var dispatch = await service.PreparePasswordResetAsync(new ForgotPasswordDto { Email = user.Email });

        Assert.NotNull(dispatch);
        Assert.False(string.IsNullOrWhiteSpace(dispatch!.Token));

        var updatedUser = await context.Users.FirstAsync(u => u.Id == user.Id);
        Assert.False(string.IsNullOrWhiteSpace(updatedUser.PasswordResetTokenHash));
        Assert.NotEqual(dispatch.Token, updatedUser.PasswordResetTokenHash);
        Assert.NotNull(updatedUser.PasswordResetTokenExpiresAt);
        Assert.True(updatedUser.PasswordResetTokenExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public async Task PreparePasswordResetAsync_ShouldReturnNullForUnknownEmail()
    {
        using var context = BuildContext();
        var service = BuildService(context);

        var dispatch = await service.PreparePasswordResetAsync(new ForgotPasswordDto
        {
            Email = "unknown@example.com"
        });

        Assert.Null(dispatch);
    }

    [Fact]
    public async Task ResetPasswordAsync_ShouldUpdatePasswordAndInvalidateToken()
    {
        using var context = BuildContext();
        var now = DateTime.UtcNow;
        var user = new User
        {
            Email = "change-password@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldP@ssw0rd1"),
            FullName = "Password User",
            Role = UserRole.Revendeur,
            Status = UserStatus.Active,
            CanLogin = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = BuildService(context);
        var dispatch = await service.PreparePasswordResetAsync(new ForgotPasswordDto { Email = user.Email });
        Assert.NotNull(dispatch);

        await service.ResetPasswordAsync(new ResetPasswordDto
        {
            Token = dispatch!.Token,
            NewPassword = "N3wStrongP@ss!",
            ConfirmPassword = "N3wStrongP@ss!"
        });

        var updatedUser = await context.Users.FirstAsync(u => u.Id == user.Id);
        Assert.Null(updatedUser.PasswordResetTokenHash);
        Assert.Null(updatedUser.PasswordResetTokenExpiresAt);
        Assert.True(BCrypt.Net.BCrypt.Verify("N3wStrongP@ss!", updatedUser.PasswordHash));

        var loginResponse = await service.LoginAsync(new LoginDto
        {
            Email = user.Email,
            Password = "N3wStrongP@ss!"
        });
        Assert.False(string.IsNullOrWhiteSpace(loginResponse.Token));
    }

    [Fact]
    public async Task ResetPasswordAsync_ShouldRejectInvalidToken()
    {
        using var context = BuildContext();
        var service = BuildService(context);

        await Assert.ThrowsAsync<AuthValidationException>(() => service.ResetPasswordAsync(new ResetPasswordDto
        {
            Token = "invalid-token",
            NewPassword = "N3wStrongP@ss!",
            ConfirmPassword = "N3wStrongP@ss!"
        }));
    }

    private static AuthService BuildService(ApplicationDbContext context)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:SecretKey"] = "TestSecretKeyForUnitTests_12345678901234567890",
                ["JwtSettings:Issuer"] = "MototunTests",
                ["JwtSettings:Audience"] = "MototunTestsClient",
                ["AuthSettings:PasswordResetTokenExpiryMinutes"] = "30"
            })
            .Build();

        return new AuthService(context, configuration);
    }

    private static ApplicationDbContext BuildContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"mototun-tests-{Guid.NewGuid():N}")
            .Options;

        return new ApplicationDbContext(options);
    }

    private static RegisterDto BuildRegisterDto(UserRole role)
    {
        return new RegisterDto
        {
            Email = "register.rev@example.com",
            Password = "P@ssw0rd!1",
            FullName = "Register Revendeur",
            Phone = "+21600000000",
            Role = role,
            BusinessName = "Register Motors",
            TaxId = $"TAX-{Guid.NewGuid():N}",
            Address = "Rue 1",
            City = "Sfax",
            PostalCode = "3000"
        };
    }

}
