const { getAdminApp, admin } = require('./firebase-admin-singleton.cjs');
const fs = require('fs');
const path = require('path');

function getBackendBaseUrl(appUrl, reqBaseUrl) {
  if (appUrl) {
    return appUrl;
  }

  if (reqBaseUrl) {
    return reqBaseUrl;
  }

  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }

  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }

  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3001';
}

function getFrontendBaseUrl(frontendUrl) {
  if (frontendUrl) {
    return frontendUrl;
  }

  if (process.env.FRONTEND_APP_URL) {
    return process.env.FRONTEND_APP_URL;
  }

  if (process.env.REACT_APP_APP_URL) {
    return process.env.REACT_APP_APP_URL;
  }

  if (process.env.REACT_APP_FRONTEND_APP_URL) {
    return process.env.REACT_APP_FRONTEND_APP_URL;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return 'https://testweb67-9c814.web.app';
}

function getRedirectUri(appUrl, reqBaseUrl) {
  return `${getBackendBaseUrl(appUrl, reqBaseUrl)}/api/auth/discord/callback`;
}

function getDiscordLoginUrl(frontendUrl, appUrl, reqBaseUrl) {
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.REACT_APP_DISCORD_CLIENT_ID;
  const redirectUri = getRedirectUri(appUrl, reqBaseUrl);
  const state = frontendUrl ? `&state=${encodeURIComponent(frontendUrl)}` : '';
  const scope = 'identify email';
  const responseType = 'code';

  if (!clientId) {
    throw new Error('DISCORD_CLIENT_ID is not configured');
  }

  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(scope)}${state}`;
}

function ensureFirebaseApp() {
  // Use the shared singleton initializer which handles reuse and errors.
  return getAdminApp();
}

async function handleDiscordCallback(code, appUrl, frontendUrl) {
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.REACT_APP_DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = getRedirectUri(appUrl);

  if (!clientId || !clientSecret) {
    throw new Error('Discord OAuth credentials are not configured');
  }

  if (!code) {
    throw new Error('Missing authorization code');
  }

  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json();
    throw new Error(error.error_description || 'Failed to exchange Discord authorization code');
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch Discord user info');
  }

  const user = await userResponse.json();

  if (!user.email) {
    throw new Error('Discord account does not have a public email. Please enable email in Discord privacy settings.');
  }

  const firebaseApp = ensureFirebaseApp();
  const uid = `discord_${user.id}`;

  let customToken;
  try {
    // Use the modular auth API to get an Auth instance for the initialized app
    const { getAuth } = require('firebase-admin/auth');
    const authInstance = getAuth(getAdminApp());
    customToken = await authInstance.createCustomToken(uid, {
      discord_id: user.id,
      discord_username: user.username,
      discord_email: user.email,
      provider: 'discord',
    });
  } catch (err) {
    console.error('Failed to create custom token:', err && err.message ? err.message : err);
    throw new Error('Custom token creation failed: ' + (err && err.message ? err.message : String(err)));
  }

  const frontendBaseUrl = getFrontendBaseUrl(frontendUrl);
  const params = new URLSearchParams({
    custom_token: customToken,
    discord_id: user.id,
    discord_email: user.email,
    discord_username: user.username,
  });

  return `${frontendBaseUrl}/auth-callback#${params.toString()}`;
}

module.exports = {
  getDiscordLoginUrl,
  handleDiscordCallback,
};
