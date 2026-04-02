import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import BrandLogo from '../components/BrandLogo';
import CloudflareTurnstile from '../components/CloudflareTurnstile';

const TURNSTILE_REQUIRED_MESSAGE = 'Please complete the security challenge.';

function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const { isArabic } = useI18n();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);
  const turnstileSiteKey = (import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || '').trim();
  const turnstileEnabled = turnstileSiteKey.length > 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (turnstileEnabled && !turnstileToken) {
      setError(TURNSTILE_REQUIRED_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const message = await forgotPassword(email, turnstileToken);
      setSuccessMessage(message);
      if (turnstileEnabled) {
        setTurnstileToken('');
        turnstileRef.current?.reset?.();
      }
    } catch (err) {
      setError(typeof err === 'string' ? err : isArabic ? 'An unexpected error occurred.' : 'Une erreur est survenue.');
      if (turnstileEnabled) {
        setTurnstileToken('');
        turnstileRef.current?.reset?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8">
        <Link to="/" className="inline-flex items-center gap-3 mb-6">
          <BrandLogo imageClassName="h-12 w-auto rounded-lg border border-slate-200 shadow" />
          <span className="text-xl font-bold text-slate-900">TuniMoto</span>
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">{isArabic ? 'Forgot password' : 'Mot de passe oublie'}</h1>
        <p className="text-sm text-slate-600 mb-6">
          {isArabic
            ? 'Enter your email. If the account exists, you will receive a reset link.'
            : 'Entrez votre email. Si le compte existe, vous recevrez un lien de reinitialisation.'}
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
              {isArabic ? 'Email' : 'Email'}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={isArabic ? 'example@email.com' : 'votre@email.com'}
              required
            />
          </div>

          {turnstileEnabled ? (
            <CloudflareTurnstile
              ref={turnstileRef}
              siteKey={turnstileSiteKey}
              action="forgot-password"
              onTokenChange={setTurnstileToken}
              onError={setError}
            />
          ) : null}

          <button
            type="submit"
            disabled={loading || (turnstileEnabled && !turnstileToken)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-60"
          >
            {loading ? (isArabic ? 'Sending...' : 'Envoi...') : (isArabic ? 'Send link' : 'Envoyer le lien')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            {isArabic ? 'Back to sign in' : 'Retour a la connexion'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
