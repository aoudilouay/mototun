using System.Text.Json;

namespace mototun.API.IntegrationTests;

internal static class TestJsonExtensions
{
    public static async Task<JsonDocument> ReadJsonAsync(this HttpResponseMessage response)
    {
        var json = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(json);
    }
}
