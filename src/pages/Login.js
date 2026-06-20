import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../config/AuthContext';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const { login, signInWithGoogle, signInWithDiscord, resetPassword, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    try {
      setLoading(true);
      const user = await login(email, password);
      
      // ตรวจสอบว่าอีเมลได้รับการยืนยันหรือไม่
      if (!user.emailVerified) {
        // redirect ไปหน้าระบบยืนยันอีเมล
        navigate('/verify-email');
        return;
      }
      
      navigate('/');
    } catch (err) {
      let errorMsg = err.message;
      if (err.message.includes('user-not-found')) {
        errorMsg = 'ไม่พบผู้ใช้';
      } else if (err.message.includes('wrong-password')) {
        errorMsg = 'รหัสผ่านไม่ถูกต้อง';
      } else if (err.message.includes('too-many-requests')) {
        errorMsg = 'พยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ในภายหลัง';
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const user = await signInWithGoogle();
      if (user) {
        navigate('/');
      }
    } catch (err) {
      const message = err?.code === 'auth/unauthorized-domain'
        ? 'โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Console (Authentication > Settings > Authorized domains)'
        : err?.message || 'ล้มเหลวในการเข้าสู่ระบบด้วย Google';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithDiscord();
    } catch (err) {
      const errorMessage = err?.message || 'ล้มเหลวในการเข้าสู่ระบบด้วย Discord';
      setError(`ล้มเหลวในการเข้าสู่ระบบด้วย Discord: ${errorMessage}`);
      console.error('Discord login error:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetMessage('');
    setError('');

    if (!resetEmail) {
      setError('กรุณากรอกอีเมล');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(resetEmail);
      setResetMessage('✓ ลิงก์รีเซ็ตรหัสผ่านถูกส่งไปยังอีเมลของคุณ');
      setTimeout(() => {
        setShowForgotPassword(false);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>เข้าสู่ระบบ</h1>

        {error && <div className="error-message">{error}</div>}

        {!showForgotPassword ? (
          <>
            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">อีเมล</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">รหัสผ่าน</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่านของคุณ"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>

            <button 
              type="button" 
              className="forgot-password-btn"
              onClick={() => setShowForgotPassword(true)}
            >
              ลืมรหัสผ่าน?
            </button>

            <div className="divider">หรือ</div>

            <div className="social-auth">
              <button 
                type="button" 
                className="btn btn-google" 
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <i className="fab fa-google"></i> Google
              </button>
              <button 
                type="button" 
                className="btn btn-discord" 
                onClick={handleDiscordLogin}
                disabled={loading}
              >
                <i className="fab fa-discord"></i> Discord
              </button>
            </div>

            <p className="auth-link">
              ไม่มีบัญชี? <Link to="/register">ลงทะเบียน</Link>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={handleResetPassword} className="auth-form">
              <p className="form-help-text">กรุณากรอกอีเมลของคุณ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้คุณ</p>
              
              <div className="form-group">
                <label htmlFor="resetEmail">อีเมล</label>
                <input
                  type="email"
                  id="resetEmail"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ต'}
              </button>
            </form>

            {resetMessage && <div className="success-message">{resetMessage}</div>}

            <button 
              type="button" 
              className="forgot-password-btn"
              onClick={() => setShowForgotPassword(false)}
            >
              ← กลับไปเข้าสู่ระบบ
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
