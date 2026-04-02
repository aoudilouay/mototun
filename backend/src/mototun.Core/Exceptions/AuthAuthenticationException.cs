namespace mototun.Core.Exceptions;

public sealed class AuthAuthenticationException : Exception
{
    public AuthAuthenticationException(string message)
        : base(message)
    {
    }
}
