const { getDiscordLoginUrl } = require('../../lib/discord-oauth.cjs');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const frontendUrl = req.query.frontend_url ? decodeURIComponent(req.query.frontend_url) : undefined;
    const discordAuthUrl = getDiscordLoginUrl(frontendUrl, req.headers.host ? `${req.protocol || 'https'}://${req.headers.host}` : undefined);
    res.redirect(discordAuthUrl);
  } catch (error) {
    console.error('Discord login error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
