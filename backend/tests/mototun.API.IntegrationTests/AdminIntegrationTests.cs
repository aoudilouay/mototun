using System.Net;
using System.Net.Http.Json;
using mototun.Core.Enums;

namespace mototun.API.IntegrationTests;

public class AdminIntegrationTests
{
    [Fact]
    public async Task Admin_CannotDisableOwnLoginAccess()
    {
        await using var factory = new TestWebApplicationFactory();
        using var adminClient = factory.CreateAuthenticatedClient(
            TestWebApplicationFactory.AdminUserId,
            UserRole.Admin);

        var response = await adminClient.PatchAsJsonAsync(
            $"/api/admin/users/{TestWebApplicationFactory.AdminUserId}",
            new
            {
                canLogin = false
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var payload = await response.ReadJsonAsync();
        Assert.Equal("You cannot remove your own admin access.", payload.RootElement.GetProperty("message").GetString());
    }
}
