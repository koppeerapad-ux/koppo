export function getSocketUrl() {
  const envSocketUrl =
    process.env.REACT_APP_SOCKET_URL ||
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  if (envSocketUrl) {
    const isLocalSocket = /(localhost|127\.0\.0\.1)(:\d+)?/.test(envSocketUrl);
    const isLocalFrontend = typeof window !== 'undefined' && /(localhost|127\.0\.0\.1)/.test(window.location.hostname);

    if (isLocalSocket && !isLocalFrontend) {
      console.warn('[socketUrl] Ignoring local socket URL in production. Using current origin instead.');
      return currentOrigin;
    }

    return envSocketUrl;
  }

  console.warn('[socketUrl] No socket URL env found. Falling back to current origin.');
  return currentOrigin;
}
