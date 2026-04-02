import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!token) {
      setError('Le lien de reinitialisation est invalide.');
      return;
    }

    setLoading(true);

    try {
      const message = await resetPassword(token, password, confirmPassword);
      setSuccessMessage(message);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-cyan-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8">
        <Link to="/" className="inline-flex items-center gap-3 mb-6">
          <BrandLogo imageClassName="h-12 w-auto rounded-lg border border-slate-200 shadow" />
          <span className="text-xl font-bold text-slate-900">TuniMoto</span>
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Nouveau mot de passe</h1>
        <p className="text-sm text-slate-600 mb-6">
          Choisissez un mot de passe fort avec majuscule, minuscule, chiffre et symbole.
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
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              minLength={10}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              minLength={10}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-60"
          >
            {loading ? 'Mise a jour...' : 'Mettre a jour le mot de passe'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Retour a la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
