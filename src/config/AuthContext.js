import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCustomToken,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from './firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sign up with email and password
  const signup = async (email, password) => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // ส่งอีเมล Verification
      await sendEmailVerification(result.user);
      
      return result.user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Sign in with email and password
  const login = async (email, password) => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
      } catch (popupError) {
        const useRedirect = [
          'auth/popup-blocked',
          'auth/popup-closed-by-user',
          'auth/cancelled-popup-request',
          'auth/operation-not-supported-in-this-environment',
        ].includes(popupError.code);

        if (useRedirect) {
          await signInWithRedirect(auth, provider);
          return null;
        }

        throw popupError;
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Sign in with Discord via backend OAuth API
  const signInWithDiscord = async () => {
    try {
      setError(null);
      const apiBase = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_BASE_URL || 'https://web-ie-ie.vercel.app';
      const frontendHost = process.env.REACT_APP_APP_URL || process.env.REACT_APP_FRONTEND_APP_URL || 'https://testweb67-9c814.web.app';
      const frontendUrl = encodeURIComponent(frontendHost);
      window.location.href = `${apiBase}/api/auth/discord/login?frontend_url=${frontendUrl}`;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Handle Discord callback from Vercel API using Custom Token
  const signInWithDiscordCallback = useCallback(async (discordData) => {
    try {
      setError(null);
      const { customToken, discordId, discordEmail, discordUsername } = discordData;

      console.log('Discord callback data:', { discordId, discordEmail, discordUsername });

      if (!customToken) {
        throw new Error('Firebase custom token is missing from Discord callback');
      }

      console.log('Signing in with Firebase Custom Token...');

      // Sign in with Firebase Custom Token
      const result = await signInWithCustomToken(auth, customToken);
      
      console.log('Discord authentication successful!');

      // Store Discord data in localStorage for future use
      localStorage.setItem('discord_username', discordUsername);
      localStorage.setItem('discord_email', discordEmail);
      localStorage.setItem('discord_id', discordId);
      
      return result.user;
    } catch (error) {
      console.error('Discord callback error:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // Sign out
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Resend verification email
  const resendVerificationEmail = async () => {
    try {
      setError(null);
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Check if email is verified
  const isEmailVerified = () => {
    return auth.currentUser?.emailVerified || false;
  };

  // Listen for auth state changes and Google redirect results
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setCurrentUser(result.user);
        }
      })
      .catch((redirectError) => {
        console.error('Google redirect error:', redirectError);
        setError(redirectError.message);
      })
      .finally(() => {
        setLoading(false);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    signInWithGoogle,
    signInWithDiscord,
    signInWithDiscordCallback,
    resendVerificationEmail,
    isEmailVerified,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
