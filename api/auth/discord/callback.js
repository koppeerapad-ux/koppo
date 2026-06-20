const { handleDiscordCallback } = require('../../lib/discord-oauth.cjs');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const frontendUrl = req.query.state ? decodeURIComponent(req.query.state) : req.query.frontend_url ? decodeURIComponent(req.query.frontend_url) : undefined;
    const backendUrl = req.headers.host ? `${req.protocol || 'https'}://${req.headers.host}` : undefined;
    const redirectUrl = await handleDiscordCallback(req.query.code, backendUrl, frontendUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Discord callback error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
