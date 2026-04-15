import { startTransition, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import BrandLogo from '../components/BrandLogo';
import CloudflareTurnstile from '../components/CloudflareTurnstile';
import { prefetchDataForRole } from '../lib/appQueries';
import { preloadRouteModule } from '../lib/routePreloaders';

const TURNSTILE_REQUIRED_MESSAGE = 'Confirmez que vous n etes pas un robot.';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const turnstileSiteKey = (import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || '').trim();
  const turnstileEnabled = turnstileSiteKey.length > 0;

  const navigateByRole = useCallback((userData) => {
    let nextPath = '';

    if (userData.role === 'Revendeur') {
      nextPath = '/revendeur/dashboard';
    } else if (userData.role === 'Fournisseur') {
      nextPath = '/fournisseur/dashboard';
    } else if (userData.role === 'Admin') {
      nextPath = '/admin/users';
    } else {
      setError(t('login.unauthorized'));
      return;
    }

    void prefetchDataForRole(queryClient, userData.role);
    void preloadRouteModule(nextPath);
    startTransition(() => {
      navigate(nextPath);
    });
  }, [navigate, queryClient, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (turnstileEnabled && !turnstileToken) {
      setError(TURNSTILE_REQUIRED_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const userData = await login(email, password, turnstileToken);
      navigateByRole(userData);
    } catch (err) {
      setError(err);
      if (turnstileEnabled) {
        setTurnstileToken('');
        turnstileRef.current?.reset?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-start justify-center px-4 py-6 sm:items-center sm:p-6 relative overflow-hidden">
      <div className="absolute left-10 top-20 hidden h-96 w-96 rounded-full bg-blue-400/20 blur-3xl animate-pulse sm:block" />
      <div className="absolute bottom-20 right-10 hidden h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl animate-pulse sm:block" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-5 sm:mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <BrandLogo imageClassName="h-14 w-auto rounded-lg border border-slate-200 shadow-lg" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              TuniMoto
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{t('login.title')}</h1>
          <p className="mx-auto max-w-sm text-sm sm:text-base text-slate-600">{t('login.subtitle')}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            Connexion rapide, meme sur mobile
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm leading-6 text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                {t('login.email')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full min-h-12 pl-12 pr-4 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                {t('login.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full min-h-12 pl-12 pr-12 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 cursor-pointer min-h-10">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">{t('login.remember')}</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium min-h-10 inline-flex items-center">
                {t('login.forgot')}
              </Link>
            </div>

            {turnstileEnabled ? (
              <CloudflareTurnstile
                ref={turnstileRef}
                siteKey={turnstileSiteKey}
                action="login"
                onTokenChange={setTurnstileToken}
                onError={setError}
              />
            ) : null}

            <button
              type="submit"
              disabled={loading || (turnstileEnabled && !turnstileToken)}
              className="w-full min-h-12 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('login.submitting')}
                </span>
              ) : (
                t('login.submit')
              )}
            </button>
          </form>

        </div>

        <div className="text-center mt-6">
          <p className="text-slate-600">
            {t('login.noAccount')}{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              {t('login.createAccount')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
