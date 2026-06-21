export function getSocketUrl() {
  const isBrowser = typeof window !== 'undefined';
  const storedSocketUrl = isBrowser ? window.localStorage.getItem('REACT_APP_SOCKET_URL') : null;
  const envSocketUrl = process.env.REACT_APP_SOCKET_URL;
  const currentOrigin = isBrowser ? window.location.origin : '';

  if (storedSocketUrl) {
    return storedSocketUrl;
  }

  if (envSocketUrl) {
    const isLocalSocket = /(localhost|127\.0\.0\.1)(:\d+)?/.test(envSocketUrl);
    const isLocalFrontend = isBrowser && /(localhost|127\.0\.0\.1)/.test(window.location.hostname);

    if (isLocalSocket && !isLocalFrontend) {
      console.warn('[socketUrl] Ignoring local socket URL in production. Using current origin instead.');
      return currentOrigin;
    }

    return envSocketUrl;
  }

  console.warn('[socketUrl] No socket URL env found. Falling back to current origin.');
  return currentOrigin;
}
