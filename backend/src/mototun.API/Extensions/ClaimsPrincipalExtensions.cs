using System.Security.Claims;

namespace mototun.API.Extensions
{
    public static class ClaimsPrincipalExtensions
    {
        public static int GetUserId(this ClaimsPrincipal user)
        {
            var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : 0;
        }

        public static string GetUserEmail(this ClaimsPrincipal user)
        {
            return user.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;
        }

        public static string GetUserRole(this ClaimsPrincipal user)
        {
            return user.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        }

        public static bool IsRevendeur(this ClaimsPrincipal user)
        {
            return user.GetUserRole() == "Revendeur";
        }

        public static bool IsFournisseur(this ClaimsPrincipal user)
        {
            return user.GetUserRole() == "Fournisseur";
        }

        public static bool IsClient(this ClaimsPrincipal user)
        {
            return user.GetUserRole() == "Client";
        }
    }
}
