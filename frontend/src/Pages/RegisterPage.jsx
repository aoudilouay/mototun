import { Link, useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import BrandLogo from '../components/BrandLogo';
import CloudflareTurnstile from '../components/CloudflareTurnstile';

const TURNSTILE_REQUIRED_MESSAGE = 'Please complete the security challenge.';

function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 2,
    acceptTerms: false,
    businessName: '',
    taxId: '',
    address: '',
    city: '',
    postalCode: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  const { register } = useAuth();
  const navigate = useNavigate();
  const { t, isArabic } = useI18n();
  const turnstileSiteKey = (import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || '').trim();
  const turnstileEnabled = turnstileSiteKey.length > 0;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('register.errPasswordMatch'));
      return;
    }

    if (formData.password.length < 10) {
      setError(t('register.errPasswordLength'));
      return;
    }

    if (!formData.acceptTerms) {
      setError(t('register.errTerms'));
      return;
    }

    if (turnstileEnabled && !turnstileToken) {
      setError(TURNSTILE_REQUIRED_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const userData = await register({
        ...formData,
        turnstileToken
      });
      if (userData.role === 'Revendeur') {
        navigate('/revendeur/dashboard');
      } else if (userData.role === 'Fournisseur') {
        navigate('/fournisseur/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err);
      setCurrentStep(1);
      if (turnstileEnabled) {
        setTurnstileToken('');
        turnstileRef.current?.reset?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const isRevendeur = Number(formData.role) === 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute left-10 top-20 hidden h-96 w-96 rounded-full bg-blue-400/20 blur-3xl animate-pulse sm:block" />
      <div className="absolute bottom-20 right-10 hidden h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl animate-pulse sm:block" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <BrandLogo imageClassName="h-14 w-auto rounded-lg border border-slate-200 shadow-lg" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              TuniMoto
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('register.title')}</h1>
          <p className="text-slate-600">{t('register.subtitle')}</p>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                1
              </div>
              <span className="text-sm font-medium hidden sm:inline">{t('register.step1')}</span>
            </div>
            <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                2
              </div>
              <span className="text-sm font-medium hidden sm:inline">{t('register.step2')}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {currentStep === 1 && (
              <>
                <div>
                  <label htmlFor="role" className="block text-sm font-semibold text-slate-700 mb-2">
                    {t('register.roleLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, role: 2 }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isRevendeur
                          ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center ${isRevendeur ? 'bg-blue-600' : 'bg-slate-200'}`}>
                          <svg className={`w-6 h-6 ${isRevendeur ? 'text-white' : 'text-slate-500'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className={`text-sm font-semibold ${isRevendeur ? 'text-blue-700' : 'text-slate-700'}`}>
                          {t('register.revendeur')}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">{t('register.revendeurHint')}</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, role: 3 }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        !isRevendeur
                          ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/20'
                          : 'border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center ${!isRevendeur ? 'bg-purple-600' : 'bg-slate-200'}`}>
                          <svg className={`w-6 h-6 ${!isRevendeur ? 'text-white' : 'text-slate-500'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                          </svg>
                        </div>
                        <span className={`text-sm font-semibold ${!isRevendeur ? 'text-purple-700' : 'text-slate-700'}`}>
                          {t('register.fournisseur')}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">{t('register.fournisseurHint')}</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700 mb-2">
                    {t('register.fullName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Ex: Mohamed Bouazizi"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="businessName" className="block text-sm font-semibold text-slate-700 mb-2">
                    {isRevendeur ? t('register.businessName') : t('register.companyName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="businessName"
                    name="businessName"
                    type="text"
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder={isRevendeur ? 'Ex: Moto Shop Tunis' : 'Ex: CCT Motors SARL'}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="taxId" className="block text-sm font-semibold text-slate-700 mb-2">
                    {t('register.taxId')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="taxId"
                    name="taxId"
                    type="text"
                    value={formData.taxId}
                    onChange={handleChange}
                    placeholder="Ex: 1234567/A/M/000"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="votre@email.com"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('register.phone')}
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+216 XX XXX XXX"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="address" className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('register.address')}
                    </label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Ex: 123 Avenue Habib Bourguiba"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('register.city')}
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Ex: Tunis"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('register.postalCode')}
                    </label>
                    <input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="Ex: 1000"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5"
                >
                  {t('register.continue')} {'>'}
                </button>
              </>
            )}

            {currentStep === 2 && (
              <>
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                    {t('register.password')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min. 10 caracteres"
                      className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                      minLength={10}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <svg className="w-5 h-5 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{t('register.passwordHint')}</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
                    {t('register.confirmPassword')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder={t('register.confirmHint')}
                      className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <svg className="w-5 h-5 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 mt-0.5 flex-shrink-0"
                    required
                  />
                  <label htmlFor="acceptTerms" className="text-sm text-slate-700">
                    {t('register.acceptTerms')}{' '}
                    <Link to="/legal" className="text-blue-600 hover:underline font-medium">{t('register.terms')}</Link>
                    {isArabic ? ' و' : ' et la '}
                    <Link to="/privacy-policy" className="text-blue-600 hover:underline font-medium">{t('register.privacy')}</Link>
                  </label>
                </div>

                {turnstileEnabled ? (
                  <CloudflareTurnstile
                    ref={turnstileRef}
                    siteKey={turnstileSiteKey}
                    action="register"
                    onTokenChange={setTurnstileToken}
                    onError={setError}
                  />
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      setTurnstileToken('');
                      turnstileRef.current?.reset?.();
                    }}
                    disabled={loading}
                    className="flex-1 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {'<'} {t('register.back')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (turnstileEnabled && !turnstileToken)}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? t('register.creating') : t('register.create')}
                  </button>
                </div>
              </>
            )}
          </form>

          {currentStep === 1 && (
            <div className="mt-8 pt-8 border-t border-slate-200">
              <p className="text-sm font-semibold text-slate-700 mb-4">{t('register.featuresTitle')}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[t('register.feature1'), t('register.feature2'), t('register.feature3'), t('register.feature4')].map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-600">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-slate-600">
            {t('register.haveAccount')}{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              {t('register.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
