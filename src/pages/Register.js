import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../config/AuthContext';
import './Auth.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const { signup, signInWithGoogle, signInWithDiscord } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation
    if (!email || !password || !confirmPassword) {
      setError('กรุณากรอกข้อมูลทั้งหมด');
      return;
    }

    if (!validateEmail(email)) {
      setError('อีเมลไม่ถูกต้อง');
      return;
    }

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      setLoading(true);
      await signup(email, password);
      setMessage('✓ ลงทะเบียนสำเร็จ! กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี');
      setTimeout(() => {
        navigate('/verify-email');
      }, 2000);
    } catch (err) {
      let errorMsg = err.message;
      if (err.message.includes('email-already-in-use')) {
        errorMsg = 'อีเมลนี้ถูกใช้งานแล้ว';
      } else if (err.message.includes('weak-password')) {
        errorMsg = 'รหัสผ่านอ่อนแอเกินไป';
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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
        : err?.message || 'ล้มเหลวในการลงทะเบียนด้วย Google';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordSignUp = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithDiscord();
    } catch (err) {
      setError(err?.message || 'ล้มเหลวในการลงทะเบียนด้วย Discord');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>ลงทะเบียน</h1>
        
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <form onSubmit={handleRegister} className="auth-form">
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
              placeholder="อย่างน้อย 6 ตัวอักษร"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="ยืนยันรหัสผ่าน"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
          </button>
        </form>

        <div className="divider">หรือ</div>

        <div className="social-auth">
          <button 
            type="button" 
            className="btn btn-google" 
            onClick={handleGoogleSignUp}
            disabled={loading}
          >
            <i className="fab fa-google"></i> Google
          </button>
          <button 
            type="button" 
            className="btn btn-discord" 
            onClick={handleDiscordSignUp}
            disabled={loading}
          >
            <i className="fab fa-discord"></i> Discord
          </button>
        </div>

        <p className="auth-link">
          มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
