namespace mototun.Core.Exceptions;

public sealed class AuthValidationException : Exception
{
    public AuthValidationException(string message)
        : base(message)
    {
    }
}
