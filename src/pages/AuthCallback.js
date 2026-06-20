import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../config/AuthContext';

function getAuthParams(searchParams) {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;

  if (hash) {
    return new URLSearchParams(hash);
  }

  return searchParams;
}

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signInWithDiscordCallback } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleDiscordCallback = async () => {
      try {
        const params = getAuthParams(searchParams);
        const customToken = params.get('custom_token');
        const discordId = params.get('discord_id');
        const discordEmail = params.get('discord_email');
        const discordUsername = params.get('discord_username');

        if (!customToken) {
          setError('Missing authentication token');
          setLoading(false);
          return;
        }

        await signInWithDiscordCallback({
          customToken,
          discordId,
          discordEmail,
          discordUsername,
        });

        window.history.replaceState(null, '', '/auth-callback');
        navigate('/');
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Failed to complete authentication');
        setLoading(false);
      }
    };

    handleDiscordCallback();
  }, [searchParams, navigate, signInWithDiscordCallback]);

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Authenticating with Discord...</h2>
          <p>Please wait while we complete your login.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Authentication Failed</h2>
          <p className="error-message">{error}</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
