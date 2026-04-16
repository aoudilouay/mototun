import { useEffect, useMemo, useState } from 'react';

const FALLBACK_LOCATION = {
  latitude: 36.8065,
  longitude: 10.1815,
  nameFr: 'Tunis',
  nameAr: 'Tunis'
};

const THEME_STYLES = {
  cyan: {
    shell: 'border-cyan-100/80 bg-[radial-gradient(circle_at_top_left,_rgba(103,232,249,0.30),_transparent_36%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,252,255,0.94))]',
    glow: 'from-cyan-200/30 via-sky-200/10 to-transparent',
    iconWrap: 'bg-cyan-100 text-cyan-700 shadow-[0_12px_26px_rgba(6,182,212,0.16)]',
    statusPill: 'border-cyan-200/80 bg-cyan-50/90 text-cyan-700',
    softPill: 'border-white/75 bg-white/82 text-slate-500',
    accent: 'text-cyan-700',
    weatherCard: 'border-cyan-100/80 bg-white/84',
    weatherChip: 'bg-cyan-50/90 text-cyan-700',
    metaCard: 'border-cyan-100/70 bg-white/82 text-slate-600',
    subtle: 'text-slate-500'
  },
  emerald: {
    shell: 'border-emerald-100/80 bg-[radial-gradient(circle_at_top_left,_rgba(110,231,183,0.28),_transparent_36%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(247,253,250,0.94))]',
    glow: 'from-emerald-200/30 via-teal-200/10 to-transparent',
    iconWrap: 'bg-emerald-100 text-emerald-700 shadow-[0_12px_26px_rgba(16,185,129,0.16)]',
    statusPill: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-700',
    softPill: 'border-white/75 bg-white/82 text-slate-500',
    accent: 'text-emerald-700',
    weatherCard: 'border-emerald-100/80 bg-white/84',
    weatherChip: 'bg-emerald-50/90 text-emerald-700',
    metaCard: 'border-emerald-100/70 bg-white/82 text-slate-600',
    subtle: 'text-slate-500'
  }
};

function normalizeWeatherCode(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function mapWeatherCode(code, isArabic) {
  if (code === 0) {
    return { kind: 'sun', label: isArabic ? 'Mushmis' : 'Ensoleille' };
  }

  if ([1, 2, 3].includes(code)) {
    return { kind: 'cloud', label: isArabic ? 'Ghaim' : 'Nuageux' };
  }

  if ([45, 48].includes(code)) {
    return { kind: 'fog', label: isArabic ? 'Dabab' : 'Brume' };
  }

  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { kind: 'rain', label: isArabic ? 'Matar' : 'Pluie' };
  }

  if (code >= 71 && code <= 77) {
    return { kind: 'snow', label: isArabic ? 'Tholouj' : 'Neige' };
  }

  if (code >= 95 && code <= 99) {
    return { kind: 'storm', label: isArabic ? 'Asifa' : 'Orage' };
  }

  return { kind: 'cloud', label: isArabic ? 'Moutaghayir' : 'Variable' };
}

function WeatherGlyph({ kind }) {
  const base = 'h-4 w-4';

  if (kind === 'sun') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      </svg>
    );
  }

  if (kind === 'rain') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 16a4 4 0 0 1 .1-8 5.5 5.5 0 0 1 10.6 1.6A3.7 3.7 0 1 1 18 16H7z" />
        <path d="M8 18.5l-1 2M12 18.5l-1 2M16 18.5l-1 2" />
      </svg>
    );
  }

  if (kind === 'storm') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 16a4 4 0 0 1 .1-8 5.5 5.5 0 0 1 10.6 1.6A3.7 3.7 0 1 1 18 16H7z" />
        <path d="M12 16l-2 3h2l-1 3 3-4h-2l1-2z" />
      </svg>
    );
  }

  if (kind === 'fog') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 10a4 4 0 0 1 7.7-1.3A3.2 3.2 0 1 1 15 15H6" />
        <path d="M4 18h10M6 21h13" />
      </svg>
    );
  }

  if (kind === 'snow') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 15a4 4 0 0 1 .1-8 5.5 5.5 0 0 1 10.6 1.6A3.7 3.7 0 1 1 18 15H7z" />
        <path d="M9 19h.01M13 20h.01M17 19h.01" />
      </svg>
    );
  }

  return (
    <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 16a4 4 0 0 1 .1-8 5.5 5.5 0 0 1 10.6 1.6A3.7 3.7 0 1 1 18 16H7z" />
    </svg>
  );
}

async function fetchCoordinatesByCity(city, signal) {
  const trimmed = String(city || '').trim();
  if (!trimmed) return null;

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=fr&format=json`;
  const response = await fetch(url, { signal });
  if (!response.ok) return null;

  const payload = await response.json();
  const first = Array.isArray(payload?.results) ? payload.results[0] : null;
  if (!first) return null;

  const latitude = Number(first.latitude);
  const longitude = Number(first.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    nameFr: first.name || trimmed,
    nameAr: first.name || trimmed
  };
}

async function fetchTodayWeather(latitude, longitude, signal) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error('Weather request failed');
  }

  const payload = await response.json();
  const current = payload?.current || {};
  const daily = payload?.daily || {};

  const temperature = Number(current.temperature_2m);
  const weatherCode = normalizeWeatherCode(current.weather_code);
  const max = Number(Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[0] : Number.NaN);
  const min = Number(Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : Number.NaN);

  return {
    temperature: Number.isFinite(temperature) ? Math.round(temperature) : null,
    weatherCode,
    max: Number.isFinite(max) ? Math.round(max) : null,
    min: Number.isFinite(min) ? Math.round(min) : null
  };
}

function HeaderGreetingWeatherCard({ displayName, city, isArabic = false, accent = 'cyan' }) {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState({
    loading: true,
    hasError: false,
    locationName: isArabic ? FALLBACK_LOCATION.nameAr : FALLBACK_LOCATION.nameFr,
    temperature: null,
    max: null,
    min: null,
    weatherCode: 0
  });

  const theme = THEME_STYLES[accent] || THEME_STYLES.cyan;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let timeoutId = null;
    let idleId = null;

    const loadWeather = async () => {
      setWeather((prev) => ({
        ...prev,
        loading: true,
        hasError: false
      }));

      let location = {
        latitude: FALLBACK_LOCATION.latitude,
        longitude: FALLBACK_LOCATION.longitude,
        nameFr: FALLBACK_LOCATION.nameFr,
        nameAr: FALLBACK_LOCATION.nameAr
      };

      try {
        const geocoded = await fetchCoordinatesByCity(city, controller.signal);
        if (geocoded) {
          location = geocoded;
        }
      } catch {
        // Keep fallback location when geocoding fails.
      }

      try {
        const current = await fetchTodayWeather(location.latitude, location.longitude, controller.signal);
        if (cancelled) return;

        setWeather({
          loading: false,
          hasError: false,
          locationName: isArabic ? location.nameAr : location.nameFr,
          temperature: current.temperature,
          max: current.max,
          min: current.min,
          weatherCode: current.weatherCode
        });
      } catch {
        if (cancelled) return;
        setWeather({
          loading: false,
          hasError: true,
          locationName: isArabic ? location.nameAr : location.nameFr,
          temperature: null,
          max: null,
          min: null,
          weatherCode: 0
        });
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(loadWeather, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(loadWeather, 250);
    }

    return () => {
      cancelled = true;
      controller.abort();
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [city, isArabic]);

  const locale = isArabic ? 'ar-TN' : 'fr-FR';
  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (isArabic) return hour < 18 ? 'Sabah el khir' : 'Massa el khir';
    return hour < 18 ? 'Bonjour' : 'Bonsoir';
  }, [isArabic, now]);

  const dateLabel = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(now);
  }, [locale, now]);

  const timeLabel = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(now);
  }, [locale, now]);

  const weatherMeta = mapWeatherCode(weather.weatherCode, isArabic);
  const greetingName = String(displayName || '').trim() || (isArabic ? 'daif' : 'invite');
  const statusLabel = 'Session active';
  const todayLabel = isArabic ? 'Aujourd hui' : "Aujourd'hui";

  return (
    <div className={`relative w-full overflow-hidden rounded-[22px] border px-3 py-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:px-4 sm:py-3 ${theme.shell}`}>
      <div className={`pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l ${theme.glow}`} />
      <div className="pointer-events-none absolute -left-6 top-2 h-16 w-16 rounded-full bg-white/25 blur-2xl" />

      <div className="relative flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${theme.statusPill}`}>
              <span className={`h-2 w-2 rounded-full ${accent === 'emerald' ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
              {statusLabel}
            </span>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm ${theme.softPill}`}>
              {todayLabel}
            </span>
          </div>

          <div className={`flex min-w-0 items-center gap-2 rounded-[18px] border px-2.5 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.04)] ${theme.weatherCard}`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] ${theme.weatherChip}`}>
              <WeatherGlyph kind={weatherMeta.kind} />
            </div>

            <div className="min-w-0 leading-tight">
              {weather.loading ? (
                <p className="text-[11px] font-semibold text-slate-500">Meteo...</p>
              ) : weather.hasError ? (
                <p className="text-[11px] font-semibold text-slate-500">Indisponible</p>
              ) : (
                <p className={`text-[14px] font-black ${theme.accent}`}>
                  {weather.temperature !== null ? `${weather.temperature} deg` : '--'}
                  {(weather.max !== null || weather.min !== null) && (
                    <span className="ml-1 text-[10px] font-semibold text-slate-400">
                      {`(${weather.max ?? '--'}/${weather.min ?? '--'})`}
                    </span>
                  )}
                </p>
              )}

              <div className="flex items-center gap-1.5">
                <p className="truncate text-[11px] font-semibold text-slate-700">
                  {weather.locationName}
                </p>
                <span className="text-slate-300">•</span>
                <p className={`truncate text-[10px] font-semibold uppercase tracking-[0.12em] ${theme.subtle}`}>
                  {!weather.loading && !weather.hasError ? weatherMeta.label : 'Temps local'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] ${theme.iconWrap}`}>
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M12 3v4" />
                <path d="M12 17v4" />
                <path d="M4.9 4.9l2.8 2.8" />
                <path d="M16.3 16.3l2.8 2.8" />
                <path d="M3 12h4" />
                <path d="M17 12h4" />
                <path d="M4.9 19.1l2.8-2.8" />
                <path d="M16.3 7.7l2.8-2.8" />
                <circle cx="12" cy="12" r="3.3" />
              </svg>
            </div>

            <div className="min-w-0">
              <p className="truncate text-[16px] font-black leading-tight tracking-[-0.02em] text-slate-950 sm:text-[18px]">
                {`${greeting}, ${greetingName}`}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium sm:text-[12px]">
                <span className={theme.accent}>{dateLabel}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">{timeLabel}</span>
              </div>
            </div>
          </div>

          <div className={`hidden items-center gap-2 rounded-[18px] border px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.04)] sm:flex ${theme.metaCard}`}>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Ville</span>
              <span className="truncate text-[12px] font-semibold text-slate-700">{weather.locationName}</span>
            </div>
            <div className="h-8 w-px bg-slate-200/80" />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Heure</span>
              <span className="text-[12px] font-semibold text-slate-700">{timeLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeaderGreetingWeatherCard;
