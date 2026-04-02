import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const TURNSTILE_SCRIPT_ID = 'mototun-cloudflare-turnstile-script';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SCRIPT_LOAD_FAILURE_MESSAGE = 'Unable to load security verification. Please refresh and retry.';
const CHALLENGE_FAILURE_MESSAGE = 'Unable to verify security challenge. Please retry.';
const CHALLENGE_EXPIRED_MESSAGE = 'Security challenge expired. Please retry.';

let turnstileScriptPromise = null;

function loadTurnstileScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile can only run in the browser.'));
  }

  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);

    const handleLoad = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
        return;
      }

      reject(new Error('Turnstile script loaded without API.'));
    };

    const handleError = () => {
      reject(new Error('Unable to load Turnstile script.'));
    };

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    turnstileScriptPromise = null;
    throw error;
  });

  return turnstileScriptPromise;
}

const CloudflareTurnstile = forwardRef(function CloudflareTurnstile(
  {
    siteKey,
    action,
    onTokenChange,
    onError,
    className = ''
  },
  ref
) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [loadError, setLoadError] = useState('');
  const isEnabled = Boolean(siteKey && siteKey.trim());

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (typeof window !== 'undefined' && window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.reset(widgetIdRef.current);
      }
      onTokenChange?.('');
    }
  }), [onTokenChange]);

  useEffect(() => {
    if (!isEnabled) {
      onTokenChange?.('');
      return undefined;
    }

    let cancelled = false;

    const renderWidget = async () => {
      try {
        const turnstile = await loadTurnstileScript();
        if (cancelled || !containerRef.current) {
          return;
        }

        if (widgetIdRef.current !== null) {
          turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey.trim(),
          action,
          callback: (token) => {
            onTokenChange?.(token);
            setLoadError('');
          },
          'expired-callback': () => {
            onTokenChange?.('');
            onError?.(CHALLENGE_EXPIRED_MESSAGE);
          },
          'error-callback': () => {
            onTokenChange?.('');
            onError?.(CHALLENGE_FAILURE_MESSAGE);
          }
        });

        setLoadError('');
      } catch {
        if (cancelled) {
          return;
        }

        onTokenChange?.('');
        setLoadError(SCRIPT_LOAD_FAILURE_MESSAGE);
      }
    };

    renderWidget();

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined' && window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [action, isEnabled, onError, onTokenChange, siteKey]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <div ref={containerRef} />
      {loadError ? (
        <p className="text-sm text-red-700 font-medium">{loadError}</p>
      ) : null}
    </div>
  );
});

export default CloudflareTurnstile;
