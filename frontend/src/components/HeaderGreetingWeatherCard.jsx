import { useEffect, useMemo, useState } from 'react';

const FALLBACK_LOCATION = {
  latitude: 36.8065,
  longitude: 10.1815,
  nameFr: 'Tunis',
  nameAr: 'Tunis'
};

const THEME_STYLES = {
  cyan: {
    iconWrap: 'bg-cyan-100 text-cyan-700',
    accent: 'text-cyan-700',
    weatherChip: 'bg-cyan-50/90 text-cyan-700',
    subtle: 'text-slate-500'
  },
  emerald: {
    iconWrap: 'bg-emerald-100 text-emerald-700',
    accent: 'text-emerald-700',
    weatherChip: 'bg-emerald-50/90 text-emerald-700',
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

  return (
    <div className="w-full">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${theme.iconWrap}`}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
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
            <p className="truncate text-[14px] font-extrabold leading-tight tracking-[-0.01em] text-slate-900">
              {`${greeting}, ${greetingName}`}
            </p>
            <p className="truncate text-[11px] font-medium text-slate-500">
              {`${dateLabel} - ${timeLabel}`}
            </p>
          </div>
        </div>

        <div className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-2xl px-2.5 py-1.5 ${theme.weatherChip} sm:ml-auto sm:min-w-[150px] sm:max-w-[220px] sm:justify-start sm:rounded-full sm:py-1`}>
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${theme.iconWrap}`}>
            <WeatherGlyph kind={weatherMeta.kind} />
          </div>

          <div className="min-w-0 flex-1 leading-tight">
            {weather.loading ? (
              <p className="text-[11px] font-semibold text-slate-500">Meteo...</p>
            ) : weather.hasError ? (
              <p className="text-[11px] font-semibold text-slate-500">Indisponible</p>
            ) : (
              <p className={`text-[13px] font-extrabold ${theme.accent}`}>
                {weather.temperature !== null ? `${weather.temperature} deg` : '--'}
                {(weather.max !== null || weather.min !== null) && (
                  <span className="ml-1 text-[10px] font-semibold text-slate-500">
                    {`(${weather.max ?? '--'}/${weather.min ?? '--'})`}
                  </span>
                )}
              </p>
            )}

            <p className={`truncate text-[10px] font-semibold ${theme.subtle}`}>
              {weather.locationName}
              {!weather.loading && !weather.hasError ? ` - ${weatherMeta.label}` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeaderGreetingWeatherCard;
