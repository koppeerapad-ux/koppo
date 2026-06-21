import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../config/AuthContext';

const SettingsModal = ({ isOpen, onClose }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [socketUrl, setSocketUrl] = useState(
    localStorage.getItem('REACT_APP_SOCKET_URL') || 
    process.env.REACT_APP_SOCKET_URL || 
    'https://koppo.onrender.com'
  );
  const [copied, setCopied] = useState(false);
  const userId = currentUser?.uid || '';
  const displayName = currentUser?.displayName || '';

  const handleSaveSettings = () => {
    if (socketUrl) {
      localStorage.setItem('REACT_APP_SOCKET_URL', socketUrl);
      alert('✅ ตั้งค่า Socket URL สำเร็จ\n(ต้องรีเฟรชหน้าเพื่อให้เปลี่ยนแปลงมีผล)');
      onClose();
    }
  };

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetSettings = () => {
    if (window.confirm('คุณแน่ใจหรือ? จะรีเซ็ตตั้งค่าทั้งหมด')) {
      localStorage.removeItem('REACT_APP_SOCKET_URL');
      setSocketUrl(process.env.REACT_APP_SOCKET_URL || 'https://koppo.onrender.com');
      alert('✅ รีเซ็ตตั้งค่าสำเร็จ');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('คุณแน่ใจว่าต้องการออกจากระบบหรือ?')) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        alert('❌ ออกจากระบบล้มเหลว: ' + error.message);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal-header">
          <h2>⚙️ ตั้งค่า</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="settings-modal-body">
          {/* User ID Section */}
          <div className="settings-section">
            <h3>👤 ข้อมูลผู้ใช้</h3>
            
            <div className="settings-field">
              <label>User ID (Unique)</label>
              <div className="user-id-display">
                <input 
                  type="text" 
                  value={userId} 
                  readOnly
                  className="user-id-input"
                />
                <button 
                  className="copy-btn"
                  onClick={handleCopyUserId}
                  title="Copy User ID"
                >
                  {copied ? '✓ Copied' : '📋'}
                </button>
              </div>
              <small>ID นี้ใช้สำหรับ switch account ในเกม</small>
            </div>

            <div className="settings-field">
              <label>ชื่อแสดง</label>
              <input 
                type="text" 
                value={displayName} 
                readOnly
                className="settings-input"
                placeholder="ไม่ได้ตั้งชื่อ"
              />
              <small>เปลี่ยนจากไปยัง Profile ได้</small>
            </div>
          </div>

          {/* Socket URL Section */}
          <div className="settings-section">
            <h3>🔌 Socket Server</h3>
            
            <div className="settings-field">
              <label>Socket Server URL</label>
              <input 
                type="text" 
                value={socketUrl}
                onChange={(e) => setSocketUrl(e.target.value)}
                className="settings-input"
                placeholder="https://koppo.onrender.com"
              />
              <small>Default: https://koppo.onrender.com (ทำการรักษา)</small>
            </div>

            {/* Socket Server Status */}
            <div className="settings-field">
              <label>สถานะการเชื่อมต่อ</label>
              <div className="server-status">
                <span className="status-indicator"></span>
                <span className="status-text">
                  {socketUrl === (process.env.REACT_APP_SOCKET_URL || 'https://koppo.onrender.com')
                    ? '✅ ใช้ Server เริ่มต้น'
                    : '⚠️ ใช้ Server ที่กำหนดเอง'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Advanced Section */}
          <div className="settings-section">
            <h3>🔧 ตั้งค่าขั้นสูง</h3>
            
            <div className="settings-field">
              <label>ข้อมูลทั่วไป</label>
              <div className="info-box">
                <p><strong>App Version:</strong> 0.1.0</p>
                <p><strong>Environment:</strong> {process.env.NODE_ENV || 'production'}</p>
                <p><strong>Socket.IO Version:</strong> 4.7.2</p>
              </div>
            </div>

            <div className="settings-field">
              <label>ล้างแคช</label>
              <button 
                className="clear-cache-btn"
                onClick={() => {
                  localStorage.clear();
                  alert('✅ ล้างแคชสำเร็จ (ต้องรีเฟรชหน้า)');
                }}
              >
                🗑️ ล้างแคชทั้งหมด
              </button>
            </div>
          </div>

          {/* Logout Section */}
          <div className="settings-section logout-section">
            <h3>🚪 ออกจากระบบ</h3>
            <button 
              className="logout-btn"
              onClick={handleLogout}
            >
              ❌ Logout
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="settings-modal-footer">
          <button className="reset-btn" onClick={handleResetSettings}>
            🔄 รีเซ็ต
          </button>
          <button className="save-btn" onClick={handleSaveSettings}>
            💾 บันทึก
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
