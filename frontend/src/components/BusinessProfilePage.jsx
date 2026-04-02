import { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper from 'react-easy-crop';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import profileService from '../services/profileService';
import { PartnershipStatus, UserRole } from '../services/partnershipService';
import { resolveAvatarUrl } from '../utils/avatar';
import { cropAndCompressAvatar, readFileAsDataUrl } from '../utils/imageTransform';
import 'react-easy-crop/react-easy-crop.css';

const themeByAccent = {
  blue: {
    header: 'from-blue-700 via-blue-600 to-cyan-600',
    avatar: 'from-blue-500 to-cyan-500',
    button: 'bg-blue-600 hover:bg-blue-700',
    inputFocus: 'focus:border-blue-500 focus:ring-blue-500'
  },
  purple: {
    header: 'from-purple-700 via-purple-600 to-indigo-600',
    avatar: 'from-purple-500 to-indigo-500',
    button: 'bg-purple-600 hover:bg-purple-700',
    inputFocus: 'focus:border-purple-500 focus:ring-purple-500'
  }
};

const maxAvatarUploadBytes = 5 * 1024 * 1024;
const maxAvatarSelectionBytes = 20 * 1024 * 1024;

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;
  return `${(kilobytes / 1024).toFixed(2)} MB`;
}

function getInitials(value) {
  const text = String(value || '').trim();
  if (!text) return 'MT';

  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return text.slice(0, 2).toUpperCase();
}

function normalizeForm(profile, showPostalCode) {
  return {
    fullName: profile?.fullName || '',
    phone: profile?.phone || '',
    businessName: profile?.businessName || '',
    taxId: profile?.taxId || '',
    address: profile?.address || '',
    city: profile?.city || '',
    postalCode: showPostalCode ? profile?.postalCode || '' : '',
    registrationNumber: profile?.registrationNumber || ''
  };
}

function formatMemberSince(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('fr-TN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function buildNetworkStats(items, selfRole) {
  const safeItems = Array.isArray(items) ? items : [];

  return {
    total: safeItems.length,
    connected: safeItems.filter((item) => item.status === PartnershipStatus.Accepted).length,
    pendingIncoming: safeItems.filter(
      (item) => item.status === PartnershipStatus.Pending && item.requestedByRole !== selfRole
    ).length,
    pendingOutgoing: safeItems.filter(
      (item) => item.status === PartnershipStatus.Pending && item.requestedByRole === selfRole
    ).length
  };
}

function BusinessProfilePage({
  accent = 'blue',
  roleLabel = 'Revendeur',
  showPostalCode = false,
  directoryLoader
}) {
  const theme = themeByAccent[accent] || themeByAccent.blue;
  const { updateUser } = useAuth();
  const selfRole = roleLabel === 'Revendeur' ? UserRole.Revendeur : UserRole.Fournisseur;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(() => normalizeForm(null, showPostalCode));
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarSourceName, setAvatarSourceName] = useState('');
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [isPreparingAvatar, setIsPreparingAvatar] = useState(false);
  const [isAvatarCropOpen, setIsAvatarCropOpen] = useState(false);
  const [avatarCropSource, setAvatarCropSource] = useState('');
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 });
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarCroppedAreaPixels, setAvatarCroppedAreaPixels] = useState(null);
  const [networkStats, setNetworkStats] = useState({
    total: 0,
    connected: 0,
    pendingIncoming: 0,
    pendingOutgoing: 0
  });

  const syncCurrentUser = useCallback(
    (profileData) => {
      if (!profileData) return;

      updateUser({
        fullName: profileData.fullName,
        phone: profileData.phone,
        avatar: profileData.avatar,
        businessName: profileData.businessName,
        city: profileData.city,
        profile: profileData
      });
    },
    [updateUser]
  );

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const requests = [profileService.getMyProfile()];
      if (typeof directoryLoader === 'function') {
        requests.push(directoryLoader());
      }

      const [profileResult, directoryResult] = await Promise.allSettled(requests);

      if (profileResult.status !== 'fulfilled') {
        throw profileResult.reason;
      }

      const profileData = profileResult.value;
      setProfile(profileData);
      setForm(normalizeForm(profileData, showPostalCode));
      setAvatarFile(null);
      setAvatarSourceName('');
      setIsAvatarCropOpen(false);
      setAvatarCropSource('');
      setAvatarCrop({ x: 0, y: 0 });
      setAvatarZoom(1);
      setAvatarCroppedAreaPixels(null);
      syncCurrentUser(profileData);

      if (directoryResult && directoryResult.status === 'fulfilled') {
        setNetworkStats(buildNetworkStats(directoryResult.value, selfRole));
      } else {
        setNetworkStats({ total: 0, connected: 0, pendingIncoming: 0, pendingOutgoing: 0 });
      }
    } catch (err) {
      setError(err.message || 'Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  }, [directoryLoader, selfRole, showPostalCode, syncCurrentUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const persistedAvatarUrl = useMemo(
    () => resolveAvatarUrl(profile?.avatar),
    [profile?.avatar]
  );

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [avatarFile]);

  const displayedAvatarUrl = avatarPreviewUrl || persistedAvatarUrl;
  const selectedAvatarLabel = avatarFile
    ? `${avatarFile.name} (${formatFileSize(avatarFile.size)})`
    : '';
  const rawAvatarLabel = avatarSourceName || '';

  const closeAvatarCropper = useCallback(() => {
    setIsAvatarCropOpen(false);
    setAvatarCrop({ x: 0, y: 0 });
    setAvatarZoom(1);
    setAvatarCroppedAreaPixels(null);
  }, []);

  const handleAvatarCropComplete = useCallback((_, croppedAreaPixels) => {
    setAvatarCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!isEditing) {
      setIsEditing(true);
    }

    if (file.size > maxAvatarSelectionBytes) {
      setError('La photo depasse 20 MB. Choisissez un fichier plus petit');
      toast.error('La photo depasse 20 MB');
      return;
    }

    if (!String(file.type || '').toLowerCase().startsWith('image/')) {
      setError('Format photo invalide. Choisissez une image');
      toast.error('Format photo invalide. Choisissez une image');
      return;
    }

    setAvatarFile(null);
    setAvatarSourceName(`${file.name} (${formatFileSize(file.size)})`);
    setIsPreparingAvatar(true);
    setError('');

    try {
      const source = await readFileAsDataUrl(file);
      if (!source) {
        throw new Error('Impossible de lire le fichier image');
      }

      setAvatarCropSource(source);
      setAvatarCrop({ x: 0, y: 0 });
      setAvatarZoom(1);
      setAvatarCroppedAreaPixels(null);
      setIsAvatarCropOpen(true);
    } catch (err) {
      const message = err?.message || 'Impossible de preparer limage';
      setError(message);
      toast.error(message);
    } finally {
      setIsPreparingAvatar(false);
    }
  };

  const handleApplyAvatarCrop = async () => {
    if (!avatarCropSource || !avatarCroppedAreaPixels) {
      setError('Selection de recadrage invalide');
      return;
    }

    setIsPreparingAvatar(true);
    setError('');

    try {
      let nextAvatarFile = await cropAndCompressAvatar(avatarCropSource, avatarCroppedAreaPixels, {
        size: 512,
        type: 'image/webp',
        quality: 0.82
      });

      if (nextAvatarFile.size > maxAvatarUploadBytes) {
        nextAvatarFile = await cropAndCompressAvatar(avatarCropSource, avatarCroppedAreaPixels, {
          size: 512,
          type: 'image/jpeg',
          quality: 0.72
        });
      }

      if (nextAvatarFile.size > maxAvatarUploadBytes) {
        throw new Error('Image trop lourde apres compression. Essayez une image plus simple');
      }

      setAvatarFile(nextAvatarFile);
      setAvatarSourceName('');
      setAvatarCropSource('');
      closeAvatarCropper();
      toast.success(`Photo optimisee: ${formatFileSize(nextAvatarFile.size)}`);
    } catch (err) {
      const message = err?.message || 'Impossible de recadrer limage';
      setError(message);
      toast.error(message);
    } finally {
      setIsPreparingAvatar(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setForm(normalizeForm(profile, showPostalCode));
    setAvatarFile(null);
    setAvatarSourceName('');
    setAvatarCropSource('');
    closeAvatarCropper();
  };

  const handleSave = async () => {
    if (!profile || isPreparingAvatar) return;

    setSaving(true);
    setError('');

    try {
      const payload = {
        fullName: form.fullName,
        phone: form.phone,
        businessName: form.businessName,
        taxId: form.taxId,
        address: form.address,
        city: form.city,
        registrationNumber: form.registrationNumber
      };

      if (showPostalCode) {
        payload.postalCode = form.postalCode;
      }

      let updated = await profileService.updateMyProfile(payload);
      if (avatarFile) {
        updated = await profileService.uploadMyAvatar(avatarFile);
      }

      setProfile(updated);
      setForm(normalizeForm(updated, showPostalCode));
      setAvatarFile(null);
      setAvatarSourceName('');
      setAvatarCropSource('');
      setIsEditing(false);
      syncCurrentUser(updated);
      toast.success(avatarFile ? 'Profil et photo mis a jour' : 'Profil mis a jour');
    } catch (err) {
      const message = err.message || 'Impossible de mettre a jour le profil';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-700" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 sm:p-6">
        <p className="font-semibold">Profil introuvable</p>
        <button
          type="button"
          onClick={loadProfile}
          className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          Reessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className={`bg-gradient-to-r px-4 py-6 text-white sm:px-6 sm:py-8 ${theme.header}`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-20 w-20 overflow-hidden rounded-2xl bg-gradient-to-br text-xl font-bold text-white shadow-lg ${theme.avatar}`}>
                {displayedAvatarUrl ? (
                  <img src={displayedAvatarUrl} alt={profile.fullName} className="h-full w-full object-cover" loading="eager" decoding="async" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">{getInitials(profile.fullName)}</div>
                )}
              </div>
              <div>
                <p className="text-sm text-white/80">{roleLabel}</p>
                <h1 className="text-3xl font-bold">{profile.fullName || '-'}</h1>
                <p className="text-sm text-white/90">{profile.businessName || '-'}</p>
                <p className="mt-1 text-xs text-white/70">Membre depuis {formatMemberSince(profile.createdAt)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-white/15 px-3 py-2">
                <p className="text-white/75">Partenaires</p>
                <p className="text-lg font-bold">{networkStats.connected}</p>
              </div>
              <div className="rounded-xl bg-white/15 px-3 py-2">
                <p className="text-white/75">Demandes recues</p>
                <p className="text-lg font-bold">{networkStats.pendingIncoming}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Informations du profil</h2>
              <p className="text-sm text-slate-600">Ces informations sont visibles lors des demandes de partenariat.</p>
            </div>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${theme.button}`}
              >
                Modifier
              </button>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={saving || isPreparingAvatar}
                  onClick={handleSave}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${theme.button}`}
                >
                  {isPreparingAvatar ? 'Preparation photo...' : saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ProfileInput label="Nom complet" value={form.fullName} disabled={!isEditing} onChange={(v) => handleFieldChange('fullName', v)} focusClass={theme.inputFocus} />
            <ProfileInput label="Email" value={profile.email || ''} disabled onChange={() => {}} focusClass={theme.inputFocus} />
            <ProfileInput label="Telephone" value={form.phone} disabled={!isEditing} onChange={(v) => handleFieldChange('phone', v)} focusClass={theme.inputFocus} />
            <ProfileInput label="Nom business" value={form.businessName} disabled={!isEditing} onChange={(v) => handleFieldChange('businessName', v)} focusClass={theme.inputFocus} />
            <ProfileInput label="Matricule fiscal" value={form.taxId} disabled={!isEditing} onChange={(v) => handleFieldChange('taxId', v)} focusClass={theme.inputFocus} />
            <ProfileInput label="Numero RC" value={form.registrationNumber} disabled={!isEditing} onChange={(v) => handleFieldChange('registrationNumber', v)} focusClass={theme.inputFocus} />
            <ProfileInput label="Adresse" value={form.address} disabled={!isEditing} onChange={(v) => handleFieldChange('address', v)} focusClass={theme.inputFocus} className="md:col-span-2" />
            <ProfileInput label="Ville" value={form.city} disabled={!isEditing} onChange={(v) => handleFieldChange('city', v)} focusClass={theme.inputFocus} />
            {showPostalCode && (
              <ProfileInput label="Code postal" value={form.postalCode} disabled={!isEditing} onChange={(v) => handleFieldChange('postalCode', v)} focusClass={theme.inputFocus} />
            )}
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Photo de profil</p>
              <p className="mt-1 text-xs text-slate-500">Choisissez une image locale. Elle apparaitra dans votre menu et vos demandes.</p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className={`h-16 w-16 overflow-hidden rounded-2xl bg-gradient-to-br text-sm font-bold text-white ${theme.avatar}`}>
                  {displayedAvatarUrl ? (
                    <img src={displayedAvatarUrl} alt={form.fullName || profile.fullName} className="h-full w-full object-cover" loading="eager" decoding="async" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">{getInitials(form.fullName || profile.fullName)}</div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/png,image/jpg,image/jpeg,image/webp,image/bmp,image/jfif,image/heic,image/heif,image/avif"
                    onChange={handleAvatarFileChange}
                    disabled={isPreparingAvatar || saving}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">Formats: PNG, JPG, WEBP, BMP, JFIF, HEIC/HEIF, AVIF. Selection max: 20 MB. Upload final max: 5 MB.</p>
                  {isPreparingAvatar && <p className="mt-1 text-xs font-medium text-blue-700">Preparation de la photo...</p>}
                  {avatarFile && <p className="mt-1 text-xs font-medium text-emerald-700">Photo recadree: {selectedAvatarLabel}</p>}
                  {!avatarFile && rawAvatarLabel && <p className="mt-1 text-xs font-medium text-amber-700">Photo choisie: {rawAvatarLabel}. Cliquez "Recadrer" puis "Appliquer".</p>}
                  {!isAvatarCropOpen && !!avatarCropSource && !avatarFile && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAvatarCropOpen(true)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Recadrer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarSourceName('');
                          setAvatarCropSource('');
                          setAvatarCroppedAreaPixels(null);
                        }}
                        className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Effacer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isAvatarCropOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recadrer la photo</h3>
                <p className="text-xs text-slate-500">Ajustez le cadre puis appliquez pour optimiser votre avatar.</p>
              </div>
              <button
                type="button"
                onClick={closeAvatarCropper}
                disabled={isPreparingAvatar}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Fermer
              </button>
            </div>

            <div className="relative h-[320px] w-full bg-slate-900 sm:h-[380px]">
              <Cropper
                image={avatarCropSource}
                crop={avatarCrop}
                zoom={avatarZoom}
                minZoom={1}
                maxZoom={3}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setAvatarCrop}
                onCropComplete={handleAvatarCropComplete}
                onZoomChange={setAvatarZoom}
              />
            </div>

            <div className="space-y-4 border-t border-slate-200 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="w-16 text-xs font-semibold uppercase tracking-wide text-slate-500">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={avatarZoom}
                  onChange={(event) => setAvatarZoom(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer rounded-lg bg-slate-200"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeAvatarCropper}
                  disabled={isPreparingAvatar}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleApplyAvatarCrop}
                  disabled={isPreparingAvatar}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${theme.button}`}
                >
                  {isPreparingAvatar ? 'Optimisation...' : 'Appliquer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileInput({ label, value, onChange, disabled, focusClass, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="text"
        value={value || ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 ${focusClass}`}
      />
    </label>
  );
}

export default BusinessProfilePage;
