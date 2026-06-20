import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendEmailVerification, reload } from 'firebase/auth';
import { auth } from '../config/firebase';
import './Auth.css';

const EmailVerification = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const user = auth.currentUser;

  // ตรวจสอบว่า email ยืนยัยแล้วหรือยัง (ทุก 3 วินาที)
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const interval = setInterval(async () => {
      try {
        await reload(user);
        if (user.emailVerified) {
          setVerified(true);
          setMessage('Email verified successfully!');
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (error) {
        console.error('Error checking verification:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, navigate]);

  // Countdown สำหรับ Resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    try {
      setLoading(true);
      await sendEmailVerification(user);
      setMessage('Verification email sent! Check your inbox.');
      setResendCooldown(60); // 60 วินาที cooldown
    } catch (error) {
      setMessage('Error sending email: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Verify Your Email</h2>
        
        {!verified ? (
          <>
            <p>
              We've sent a verification link to <strong>{user?.email}</strong>
            </p>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
              Click the link in your email to verify your account. This page will automatically update once verified.
            </p>

            {message && (
              <div style={{
                backgroundColor: '#d4edda',
                color: '#155724',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '15px',
                fontSize: '14px'
              }}>
                {message}
              </div>
            )}

            <div style={{ marginBottom: '20px', textAlign: 'center', color: '#666' }}>
              <p style={{ fontSize: '12px' }}>
                Didn't receive the email? Check your spam folder or
              </p>
              <button
                onClick={handleResendEmail}
                disabled={loading || resendCooldown > 0}
                style={{
                  backgroundColor: resendCooldown > 0 ? '#ccc' : '#6366f1',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  marginTop: '10px'
                }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
              </button>
            </div>

            <div style={{
              backgroundColor: '#f0f0f0',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#666'
            }}>
              <p style={{ margin: '0 0 8px 0' }}>⏳ Auto-checking: This page updates every 3 seconds</p>
              <p style={{ margin: '0' }}>📧 Check email: {user?.email}</p>
            </div>
          </>
        ) : (
          <>
            <div style={{
              backgroundColor: '#d4edda',
              color: '#155724',
              padding: '15px',
              borderRadius: '4px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              ✓ Email verified successfully!
            </div>
            <p>Redirecting to home page...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;
