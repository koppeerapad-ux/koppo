require('dotenv').config({ path: '.env.local' });

const express = require('express');
const { getDiscordLoginUrl, handleDiscordCallback } = require('../api/lib/discord-oauth.cjs');

const app = express();
const PORT = process.env.API_PORT || 3001;

app.get('/api/auth/discord/login', (req, res) => {
  try {
    const frontendUrl = req.query.frontend_url ? decodeURIComponent(req.query.frontend_url) : undefined;
    res.redirect(getDiscordLoginUrl(frontendUrl));
  } catch (error) {
    console.error('Discord login error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/discord/callback', async (req, res) => {
  try {
    const frontendUrl = req.query.state ? decodeURIComponent(req.query.state) : req.query.frontend_url ? decodeURIComponent(req.query.frontend_url) : undefined;
    const redirectUrl = await handleDiscordCallback(req.query.code, undefined, frontendUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Discord callback error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Discord OAuth API running on http://localhost:${PORT}`);
});
