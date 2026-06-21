import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../config/AuthContext';
import BattleSingerMode from '../../components/MelodyMess/BattleSingerMode';
import SongChainMode from '../../components/MelodyMess/SongChainMode';
import SettingsModal from '../../components/MelodyMess/SettingsModal';
import '../MelodyMess/MelodyMess.css';

const MelodyMessLobby = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [gameMode, setGameMode] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [pendingRoomCode, setPendingRoomCode] = useState(null);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  if (!currentUser) {
    return (
      <div className="melody-mess-container">
        <div className="auth-warning">
          <p>⚠️ Please login first</p>
          <button onClick={() => navigate('/login')}>Go to Login</button>
        </div>
      </div>
    );
  }

  if (gameMode === 'battle') {
    return <BattleSingerMode onBack={() => {
      setGameMode(null);
      setPendingRoomCode(null);
    }} initialRoomCode={pendingRoomCode} />;
  }

  if (gameMode === 'chain') {
    return <SongChainMode onBack={() => setGameMode(null)} />;
  }

  return (
    <div className="sing-party-container">
      {/* Header */}
      <div className="lobby-header">
        <div className="header-left">
          <button className="back-home-btn" onClick={() => navigate('/')}>←</button>
          <div className="user-info">
          <img src={currentUser.photoURL || '👤'} alt={currentUser.displayName} className="user-avatar" />
          <div className="user-details">
            <div className="user-name">{currentUser.displayName || 'Player'}</div>
              <div className="user-level">Lv.12</div>
            </div>
          </div>
          <div className="user-points">⭐ 1,250</div>
        </div>
        <div className="header-right">
          <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙️</button>
          <button 
            className="logout-header-btn" 
            onClick={async () => {
              if (window.confirm('ออกจากระบบจริงหรือ?')) {
                try {
                  await logout();
                  navigate('/login');
                } catch (error) {
                  alert('❌ ออกจากระบบล้มเหลว: ' + error.message);
                }
              }
            }}
            title="Logout"
          >
            🚪
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lobby-main">
        {/* Cute Character */}
        <div className="character-section">
          <div className="character">🎤</div>
          <div className="character-bubble">มาไร้เสียง<br />กันเถอะ! ❤️</div>
        </div>

        {/* Title */}
        <div className="lobby-title-section">
          <div className="title-emoji">🎤</div>
          <h1>SING PARTY</h1>
          <p>ร้อง · โหวต · สร้างเพลง</p>
        </div>

        {/* Mode Cards */}
        <div className="mode-cards-container">
          <div 
            className="mode-card battle-card"
            onClick={() => setGameMode('battle')}
          >
            <div className="card-badge">โหมด 1</div>
            <h3>Battle Singer</h3>
            <p>ร้องลอกโลยแล้วให้เพื่อนคุณหนะ!</p>
            <div className="card-character">🎤👨‍🎤</div>
          </div>

          <div 
            className="mode-card chain-card"
            onClick={() => setGameMode('chain')}
          >
            <div className="card-badge">โหมด 2</div>
            <h3>Song Chain</h3>
            <p>ร้องต่อจากเพื่อนแต่ละคน!</p>
            <div className="card-character">🎵👫</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons-section">
          <button className="action-btn create-room-btn" onClick={() => setGameMode('battle')}>
            <span>➕</span> สร้างห้อง
          </button>
          <button 
            className="action-btn join-room-btn"
            onClick={() => setShowJoinInput(!showJoinInput)}
          >
            <span>🎫</span> เข้าร่วมห้อง
          </button>
        </div>

        {/* Join Room Input */}
        {showJoinInput && (
          <div className="join-room-modal">
            <div className="modal-content">
              <input 
                type="text" 
                placeholder="ใส่รหัสห้อง (4-6 ตัวอักษร)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength="6"
                className="room-code-input"
              />
              <button 
                className="join-btn"
                onClick={() => {
                  if (roomCode.length === 6) {
                    setPendingRoomCode(roomCode);
                    setRoomCode('');
                    setShowJoinInput(false);
                    setGameMode('battle');
                  }
                }}
              >
                เข้าห้อง
              </button>
            </div>
          </div>
        )}

        {/* Hot Performance Section */}
        <div className="hot-section">
          <div className="section-title">🔥 ห้องยอดนิยม</div>
          <div className="hot-items">
            <div className="hot-item">
              <span className="music-icon">🎵</span>
              <span className="hot-name">เพลงวิทนี่</span>
              <span className="player-count">7/8</span>
            </div>
            <div className="hot-item">
              <span className="music-icon">🎵</span>
              <span className="hot-name">เพลงสตริงเพราะๆ</span>
              <span className="player-count">5/8</span>
            </div>
            <div className="hot-item">
              <span className="music-icon">🎵</span>
              <span className="hot-name">ก้องข้างฮา</span>
              <span className="player-count">6/8</span>
            </div>
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div className="leaderboard-section">
          <div className="section-title">🏆 TOP SINGER วันนี้</div>
          <div className="leaderboard-items">
            <div className="leaderboard-item">
              <span className="rank">1</span>
              <div className="player-info">
                <span className="player-name">icekungg</span>
              </div>
              <span className="score">⭐ 3,210</span>
            </div>
            <div className="leaderboard-item">
              <span className="rank">2</span>
              <div className="player-info">
                <span className="player-name">Plotyy</span>
              </div>
              <span className="score">⭐ 2,850</span>
            </div>
            <div className="leaderboard-item">
              <span className="rank">3</span>
              <div className="player-info">
                <span className="player-name">NonXD</span>
              </div>
              <span className="score">⭐ 2,540</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span>🏠</span>
          <span>หน้าหลัก</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          <span>👥</span>
          <span>เพื่อน</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'songs' ? 'active' : ''}`}
          onClick={() => setActiveTab('songs')}
        >
          <span>🎵</span>
          <span>ห้องของฉัน</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span>⚙️</span>
          <span>ตั้งค่า</span>
        </button>
      </div>

      {/* Online Status */}
      <div className="online-status">
        🟢 ออนไลน์ 542 คน
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default MelodyMessLobby;
