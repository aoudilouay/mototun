using System.Data.Common;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using mototun.API.Extensions;
using mototun.API.Security;
using mototun.API.Services.Email;
using mototun.API.Services.Security;
using mototun.Core.DTOs.Auth;
using mototun.Core.Exceptions;
using mototun.Core.Interfaces;

namespace mototun.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IApplicationEmailService _applicationEmailService;
        private readonly ITurnstileValidationService _turnstileValidationService;
        private readonly IConfiguration _configuration;
        private readonly IHostEnvironment _environment;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IAuthService authService,
            IApplicationEmailService applicationEmailService,
            ITurnstileValidationService turnstileValidationService,
            IConfiguration configuration,
            IHostEnvironment environment,
            ILogger<AuthController> logger)
        {
            _authService = authService;
            _applicationEmailService = applicationEmailService;
            _turnstileValidationService = turnstileValidationService;
            _configuration = configuration;
            _environment = environment;
            _logger = logger;
        }

        [EnableRateLimiting("AuthRegister")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto, CancellationToken cancellationToken)
        {
            var turnstileFailure = await ValidateTurnstileOrBadRequestAsync(dto.TurnstileToken, "register", cancellationToken);
            if (turnstileFailure is not null)
            {
                return turnstileFailure;
            }

            try
            {
                var response = await _authService.RegisterAsync(dto);
                await TrySendWelcomeEmailAsync(response.Email, response.FullName, response.Role, cancellationToken);
                SetAuthCookie(response.Token);
                response.Token = string.Empty;
                return Ok(new
                {
                    success = true,
                    message = "Compte cree avec succes.",
                    data = response
                });
            }
            catch (AuthValidationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (DbUpdateException)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, BuildDatabaseUnavailableResponse());
            }
            catch (DbException)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, BuildDatabaseUnavailableResponse());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error in register endpoint.");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = "Une erreur est survenue pendant la creation du compte."
                });
            }
        }

        [EnableRateLimiting("AuthLogin")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto, CancellationToken cancellationToken)
        {
            var turnstileFailure = await ValidateTurnstileOrBadRequestAsync(dto.TurnstileToken, "login", cancellationToken);
            if (turnstileFailure is not null)
            {
                return turnstileFailure;
            }

            try
            {
                var response = await _authService.LoginAsync(dto);
                SetAuthCookie(response.Token);
                response.Token = string.Empty;
                return Ok(new
                {
                    success = true,
                    message = "Connexion reussie.",
                    data = response
                });
            }
            catch (AuthAuthenticationException ex)
            {
                return Unauthorized(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (DbUpdateException)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, BuildDatabaseUnavailableResponse());
            }
            catch (DbException)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, BuildDatabaseUnavailableResponse());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error in login endpoint.");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = "Une erreur est survenue pendant la connexion."
                });
            }
        }

        [EnableRateLimiting("AuthForgotPassword")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto, CancellationToken cancellationToken)
        {
            const string genericMessage = "Si cet email existe, vous allez recevoir un lien de reinitialisation.";

            var turnstileFailure = await ValidateTurnstileOrBadRequestAsync(dto.TurnstileToken, "forgot-password", cancellationToken);
            if (turnstileFailure is not null)
            {
                return turnstileFailure;
            }

            try
            {
                var dispatch = await _authService.PreparePasswordResetAsync(dto, cancellationToken);
                if (dispatch is not null)
                {
                    try
                    {
                        var resetLink = BuildPasswordResetUrl(dispatch.Token);
                        await _applicationEmailService.SendPasswordResetAsync(
                            dispatch.Email,
                            dispatch.FullName,
                            resetLink,
                            GetPasswordResetTokenExpiryMinutes(),
                            cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send password reset email to {Email}", dispatch.Email);
                    }
                }

                return Ok(new
                {
                    success = true,
                    message = genericMessage
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error in forgot-password endpoint.");
                return Ok(new
                {
                    success = true,
                    message = genericMessage
                });
            }
        }

        [EnableRateLimiting("AuthResetPassword")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto, CancellationToken cancellationToken)
        {
            try
            {
                await _authService.ResetPasswordAsync(dto, cancellationToken);
                return Ok(new
                {
                    success = true,
                    message = "Mot de passe mis a jour."
                });
            }
            catch (AuthValidationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error in reset-password endpoint.");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = "Une erreur est survenue pendant le changement du mot de passe."
                });
            }
        }

        [Authorize]
        [EnableRateLimiting("AuthRead")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdValue, out var userId))
            {
                return Unauthorized(new
                {
                    success = false,
                    message = "Session invalide."
                });
            }

            var response = await _authService.GetByIdAsync(userId);
            if (response is null)
            {
                ClearAuthCookie();
                return Unauthorized(new
                {
                    success = false,
                    message = "Votre session a expire."
                });
            }

            response.Token = string.Empty;
            return Ok(new
            {
                success = true,
                data = response
            });
        }

        [EnableRateLimiting("AuthWrite")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        [HttpPost("logout")]
        public IActionResult Logout()
        {
            ClearAuthCookie();
            return Ok(new
            {
                success = true,
                message = "Deconnexion reussie."
            });
        }

        [Authorize]
        [EnableRateLimiting("AuthLookup")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        [HttpGet("check-email/{email}")]
        public async Task<IActionResult> CheckEmail(string email)
        {
            try
            {
                var exists = await _authService.UserExistsAsync(email);
                return Ok(new
                {
                    success = true,
                    exists
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error in check-email endpoint.");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = "Une erreur est survenue pendant la verification de l email."
                });
            }
        }

        private async Task<IActionResult?> ValidateTurnstileOrBadRequestAsync(
            string? turnstileToken,
            string expectedAction,
            CancellationToken cancellationToken)
        {
            var result = await _turnstileValidationService.ValidateAsync(turnstileToken, expectedAction, cancellationToken);
            if (result.Success)
            {
                return null;
            }

            return BadRequest(new
            {
                success = false,
                message = result.Message
            });
        }

        private string BuildPasswordResetUrl(string token)
        {
            var configuredBaseUrl = _configuration["AuthSettings:PasswordResetUrl"]?.Trim();
            if (!ConfigurationValueGuards.HasConfiguredValue(configuredBaseUrl))
            {
                if (!_environment.IsDevelopment())
                {
                    throw new InvalidOperationException("AuthSettings:PasswordResetUrl must be configured outside development.");
                }

                configuredBaseUrl = "http://localhost:5173/reset-password";
            }

            if (!_environment.IsDevelopment()
                && (!Uri.TryCreate(configuredBaseUrl, UriKind.Absolute, out var configuredUri)
                    || !string.Equals(configuredUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
                    || configuredUri.IsLoopback
                    || configuredUri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException("AuthSettings:PasswordResetUrl must be an absolute HTTPS frontend URL outside development.");
            }

            var passwordResetUrl = configuredBaseUrl!;
            var separator = passwordResetUrl.Contains('?') ? "&" : "?";
            return $"{passwordResetUrl}{separator}token={Uri.EscapeDataString(token)}";
        }

        private int GetPasswordResetTokenExpiryMinutes()
        {
            var configuredValue = _configuration.GetValue<int?>("AuthSettings:PasswordResetTokenExpiryMinutes");
            return Math.Clamp(configuredValue ?? 30, 10, 120);
        }

        private async Task TrySendWelcomeEmailAsync(
            string email,
            string? fullName,
            string? role,
            CancellationToken cancellationToken)
        {
            try
            {
                await _applicationEmailService.SendWelcomeAsync(email, fullName, role, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send welcome email to {Email}", email);
            }
        }

        private void SetAuthCookie(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return;
            }

            var requireSecureCookie = !_environment.IsDevelopment() || Request.IsHttps;
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = requireSecureCookie,
                SameSite = SameSiteMode.Strict,
                IsEssential = true,
                Path = AuthCookieDefaults.CookiePath,
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            };

            Response.Headers.CacheControl = "no-store";
            Response.Headers.Pragma = "no-cache";
            Response.Cookies.Append(AuthCookieDefaults.CookieName, token, cookieOptions);
        }

        private void ClearAuthCookie()
        {
            var requireSecureCookie = !_environment.IsDevelopment() || Request.IsHttps;
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = requireSecureCookie,
                SameSite = SameSiteMode.Strict,
                IsEssential = true,
                Path = AuthCookieDefaults.CookiePath
            };

            Response.Headers.CacheControl = "no-store";
            Response.Headers.Pragma = "no-cache";
            Response.Cookies.Delete(AuthCookieDefaults.CookieName, cookieOptions);
        }

        private static object BuildDatabaseUnavailableResponse()
        {
            return new
            {
                success = false,
                message = "La base de donnees ne repond pas pour le moment."
            };
        }
    }
}
