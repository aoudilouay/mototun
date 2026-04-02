using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using mototun.Core.Entities;
using mototun.Core.Enums;
using mototun.Infrastructure.Data;

namespace mototun.API.IntegrationTests;

public class ProfileIntegrationTests
{
    [Fact]
    public async Task Revendeur_CanGetAndUpdateProfile()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        var getResponse = await revendeurClient.GetAsync("/api/profile/me");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        using (var getPayload = await getResponse.ReadJsonAsync())
        {
            var data = getPayload.RootElement.GetProperty("data");
            Assert.Equal("Revendeur Integration SARL", data.GetProperty("businessName").GetString());
        }

        var updateResponse = await revendeurClient.PutAsJsonAsync("/api/profile/me", new
        {
            fullName = "Revendeur Updated",
            phone = "99112233",
            businessName = "Revendeur Integration Prime",
            city = "Bizerte",
            postalCode = "7000",
            registrationNumber = "REG-2026"
        });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        using var updatePayload = await updateResponse.ReadJsonAsync();
        var updateData = updatePayload.RootElement.GetProperty("data");
        Assert.Equal("Revendeur Updated", updateData.GetProperty("fullName").GetString());
        Assert.Equal("Revendeur Integration Prime", updateData.GetProperty("businessName").GetString());
        Assert.Equal("Bizerte", updateData.GetProperty("city").GetString());
    }

    [Fact]
    public async Task Revendeur_UpdateProfile_RejectsDuplicateTaxId()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var now = DateTime.UtcNow;

            var otherUser = new User
            {
                Email = "other.revendeur.profile@mototun.test",
                PasswordHash = "hash",
                FullName = "Other Revendeur",
                Role = UserRole.Revendeur,
                Status = UserStatus.Active,
                CanLogin = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            db.Users.Add(otherUser);
            await db.SaveChangesAsync();

            db.Revendeurs.Add(new Revendeur
            {
                UserId = otherUser.Id,
                BusinessName = "Other Business",
                TaxId = "RV-DUP-0001",
                Address = "Other Address",
                City = "Gabes",
                CreatedAt = now
            });
            await db.SaveChangesAsync();
        }

        var response = await revendeurClient.PutAsJsonAsync("/api/profile/me", new
        {
            taxId = "RV-DUP-0001"
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task UploadAvatar_WithUnsupportedFile_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);

        using var form = new MultipartFormDataContent();
        var fileBytes = new byte[] { 0x31, 0x32, 0x33 };
        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
        form.Add(fileContent, "file", "avatar.txt");

        var response = await revendeurClient.PostAsync("/api/profile/me/avatar", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UploadAvatar_WithValidImage_IsServedFromAvatarStoragePath()
    {
        await using var factory = new TestWebApplicationFactory();
        using var revendeurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.RevendeurUserId,
            UserRole.Revendeur);
        using var publicClient = factory.CreateClient();

        using var form = new MultipartFormDataContent();
        var fileBytes = new byte[]
        {
            0x89, 0x50, 0x4E, 0x47,
            0x0D, 0x0A, 0x1A, 0x0A
        };
        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "file", "avatar.png");

        var uploadResponse = await revendeurClient.PostAsync("/api/profile/me/avatar", form);

        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        using var uploadPayload = await uploadResponse.ReadJsonAsync();
        var avatarPath = uploadPayload.RootElement.GetProperty("data").GetProperty("avatar").GetString();

        Assert.False(string.IsNullOrWhiteSpace(avatarPath));

        var avatarResponse = await publicClient.GetAsync($"/{avatarPath}");

        Assert.Equal(HttpStatusCode.OK, avatarResponse.StatusCode);
        Assert.Equal("image/png", avatarResponse.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Fournisseur_CanReadOwnProfile()
    {
        await using var factory = new TestWebApplicationFactory();
        using var fournisseurClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.FournisseurUserId,
            UserRole.Fournisseur);

        var response = await fournisseurClient.GetAsync("/api/profile/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var payload = await response.ReadJsonAsync();
        var data = payload.RootElement.GetProperty("data");
        Assert.Equal((int)UserRole.Fournisseur, data.GetProperty("role").GetInt32());
    }
}
