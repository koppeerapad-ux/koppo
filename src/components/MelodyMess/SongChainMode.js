import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../config/AuthContext';
import { AudioRecorder } from '../../utils/audioProcessing/audioRecorder';
import { getSocketUrl } from '../../utils/socketUrl';
import './SongChain.css';

const SongChainMode = ({ onBack }) => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState('LOBBY'); // LOBBY, WAITING, ORIGIN, CHAIN, RESULT
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState({});
  const [playerQueue, setPlayerQueue] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [songTitle, setSongTitle] = useState('');
  const [songTitleInput, setSongTitleInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recorder, setRecorder] = useState(null);
  const [finalAudio, setFinalAudio] = useState(null);
  const [socketError, setSocketError] = useState(null);
  const [socketUrl, setSocketUrl] = useState(null);

  // Initialize Socket.io
  useEffect(() => {
    const resolvedSocketUrl = getSocketUrl();
    setSocketUrl(resolvedSocketUrl);
    const newSocket = io(resolvedSocketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
    });
    console.log('Connecting SongChain socket to', resolvedSocketUrl);

    newSocket.on('connect', () => {
      console.log('SongChain socket connected:', newSocket.id);
      setSocketError(null);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connect error:', error);
      setSocketError(error.message || 'Socket connection failed.');
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setSocketError(error?.message || String(error));
    });

    newSocket.on('ROOM_CREATED', ({ roomCode: code }) => {
      setRoomCode(code);
    });

    newSocket.on('CHAIN_STARTED', ({ queue, currentPlayer }) => {
      setGameState('WAITING_ORIGIN');
      setPlayerQueue(queue);
    });

    newSocket.on('ORIGIN_RECORDED', ({ songTitle: title, audioClip }) => {
      setSongTitle(title);
      setGameState('CHAIN');
      setCurrentPlayerIndex(1);
    });

    newSocket.on('CHAIN_PLAYER_RECORDING', ({ currentIndex, playerName }) => {
      setCurrentPlayerIndex(currentIndex);
    });

    newSocket.on('CHAIN_COMPLETED', ({ finalAudioUrl, duration }) => {
      setFinalAudio(finalAudioUrl);
      setGameState('RESULT');
    });

    newSocket.on('ROOM_PLAYERS', ({ players: playerList }) => {
      setPlayers(playerList);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  // Create room
  const handleCreateRoom = () => {
    socket?.emit('CREATE_ROOM', {
      name: currentUser.displayName,
      photoURL: currentUser.photoURL,
    });
    setGameState('WAITING_PLAYERS');
  };

  // Start Chain Mode
  const handleStartChain = () => {
    socket?.emit('START_SONG_CHAIN', { roomCode });
  };

  // Set origin song and record first part
  const handleSetOrigin = async () => {
    if (songTitleInput.trim()) {
      setSongTitle(songTitleInput);
      setGameState('ORIGIN_RECORDING');
      setSongTitleInput('');
    }
  };

  // Recording functions
  const handleStartRecording = async () => {
    const newRecorder = new AudioRecorder({
      maxDuration: 15000, // 15 seconds for chain mode
      onTimeUpdate: (time) => setRecordingTime(time),
    });

    const success = await newRecorder.startRecording();
    if (success) {
      setRecorder(newRecorder);
      setIsRecording(true);
    }
  };

  const handleStopRecording = async () => {
    if (recorder) {
      const audioData = await recorder.stopRecording();
      if (audioData) {
        const base64Data = await recorder.getBlobAsBase64();
        if (gameState === 'ORIGIN_RECORDING') {
          socket?.emit('ORIGIN_RECORDED', {
            roomCode,
            songTitle,
            audioData: base64Data,
          });
        } else {
          socket?.emit('CHAIN_RECORDED', {
            roomCode,
            playerId: socket.id,
            audioData: base64Data,
          });
        }
        setIsRecording(false);
        setRecordingTime(0);
      }
    }
  };

  // LOBBY Screen
  if (gameState === 'LOBBY') {
    return (
      <div className="song-chain-container">
        <button className="back-btn" onClick={onBack}>← ย้อนกลับ</button>
        <h1>🎵 Song Chain</h1>
        {socketUrl && (
          <div className="socket-info">Socket URL: <code>{socketUrl}</code></div>
        )}
        {socketError && (
          <div className="socket-error">
            <strong>ไม่สามารถเชื่อมต่อเกมเซิร์ฟเวอร์ได้:</strong> {socketError}
            <p>ตรวจสอบค่า <code>REACT_APP_SOCKET_URL</code> หรือ host ของ Socket.io server</p>
          </div>
        )}
        <p>ร้องต่อจากเพื่อนแต่ละคน สร้างเพลงตลกๆ ยาวเดียว!</p>
        <button className="create-btn" onClick={handleCreateRoom}>สร้างห้องใหม่</button>
      </div>
    );
  }

  // WAITING PLAYERS Screen
  if (gameState === 'WAITING_PLAYERS') {
    return (
      <div className="song-chain-container">        {socketError && (
          <div className="socket-error">
            <strong>ไม่สามารถเชื่อมต่อเกมเซิร์ฟเวอร์ได้:</strong> {socketError}
            <p>ตรวจสอบว่า Socket.io server ทำงานและ `REACT_APP_SOCKET_URL` ชี้ไปยัง host ที่ถูกต้อง</p>
          </div>
        )}
        <div className="room-info">
          <h2>รหัสห้อง: <span className="room-code">{roomCode || 'กำลังสร้าง...'}</span></h2>
          <p>🎵 {roomCode ? 'รอเพื่อนเข้าห้อง (ต้องมี 2-4 คน)' : 'กำลังสร้างห้อง โปรดรอสักครู่...'}</p>
        </div>

        <div className="players-list">
          {Object.values(players).map((p) => (
            <div key={p.id} className="player-item">
              <img src={p.photoURL} alt={p.name} />
              <span>{p.name}</span>
            </div>
          ))}
        </div>

        {Object.keys(players).length >= 2 && (
          <button className="start-btn" onClick={handleStartChain}>เริ่มร้องต่อเพลง</button>
        )}
      </div>
    );
  }

  // ORIGIN SETUP Screen
  if (gameState === 'WAITING_ORIGIN') {
    return (
      <div className="song-chain-container">
        <h2>🎸 ตั้งชื่อเพลง</h2>
        <input
          type="text"
          placeholder="ใส่ชื่อเพลง"
          value={songTitleInput}
          onChange={(e) => setSongTitleInput(e.target.value)}
          className="song-input"
        />
        <button onClick={handleSetOrigin} className="confirm-btn">ถัดไป</button>
      </div>
    );
  }

  // ORIGIN RECORDING Screen
  if (gameState === 'ORIGIN_RECORDING') {
    return (
      <div className="song-chain-container">
        <h2>🎤 {songTitle}</h2>
        <p>คนที่ 1 ร้องท่วงเริ่มต้นเป็นเวลา 15 วินาที</p>

        <div className="timer">{recordingTime}s / 15s</div>

        {isRecording ? (
          <button className="stop-btn" onClick={handleStopRecording}>⏹️ หยุด</button>
        ) : (
          <button className="record-btn" onClick={handleStartRecording}>🎤 เริ่มอัด</button>
        )}
      </div>
    );
  }

  // CHAIN RECORDING Screen
  if (gameState === 'CHAIN') {
    const currentPlayer = playerQueue[currentPlayerIndex];
    const isYourTurn = currentPlayer === socket?.id;

    return (
      <div className="song-chain-container">
        <h2>⛓️ {songTitle}</h2>
        
        {isYourTurn ? (
          <>
            <p>คิวของคุณ! ฟังเสียงสุดท้าย 3 วินาที แล้วร้องต่อ (15 วินาที)</p>
            <div className="timer">{recordingTime}s / 15s</div>

            {isRecording ? (
              <button className="stop-btn" onClick={handleStopRecording}>⏹️ หยุด</button>
            ) : (
              <button className="record-btn" onClick={handleStartRecording}>🎤 เริ่มอัด</button>
            )}
          </>
        ) : (
          <p>⏳ คอยถึงคิวของคุณ... ({playerQueue[currentPlayerIndex]} กำลังร้อง)</p>
        )}

        <div className="queue-info">
          <p>ลำดับคิว:</p>
          {playerQueue.map((pid, idx) => (
            <div 
              key={pid} 
              className={`queue-item ${idx === currentPlayerIndex ? 'active' : ''} ${idx < currentPlayerIndex ? 'done' : ''}`}
            >
              {idx + 1}. {players[pid]?.name}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // RESULT Screen
  if (gameState === 'RESULT') {
    return (
      <div className="song-chain-container">
        <h2>🎉 เพลงสร้างสรรค์!</h2>
        {finalAudio && (
          <div className="final-result">
            <h3>{songTitle}</h3>
            <audio controls>
              <source src={finalAudio} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        <div className="action-buttons">
          <button onClick={() => setGameState('LOBBY')}>🔄 เล่นอีกรอบ</button>
          <button onClick={onBack}>← ออกจากห้อง</button>
        </div>
      </div>
    );
  }

  return <div>Loading...</div>;
};

export default SongChainMode;
