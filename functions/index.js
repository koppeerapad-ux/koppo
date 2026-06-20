const functions = require('firebase-functions');
const express = require('express');
const { getDiscordLoginUrl, handleDiscordCallback } = require('../api/lib/discord-oauth.cjs');

const app = express();

function getAppUrl(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = forwardedProto ? forwardedProto.split(',')[0] : req.protocol;
  return `${protocol}://${req.get('host')}`;
}

app.get('/api/auth/discord/login', (req, res) => {
  try {
    const appUrl = getAppUrl(req);
    const frontendUrl = req.query.frontend_url ? decodeURIComponent(req.query.frontend_url) : undefined;
    res.redirect(getDiscordLoginUrl(frontendUrl, appUrl));
  } catch (error) {
    console.error('Discord login error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/discord/callback', async (req, res) => {
  try {
    const appUrl = getAppUrl(req);
    const frontendUrl = req.query.state ? decodeURIComponent(req.query.state) : req.query.frontend_url ? decodeURIComponent(req.query.frontend_url) : undefined;
    const redirectUrl = await handleDiscordCallback(req.query.code, appUrl, frontendUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Discord callback error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

exports.discordAuth = functions.https.onRequest(app);
