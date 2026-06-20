import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../config/AuthContext';
import { AudioRecorder, playAudio, stopAudio } from '../../utils/audioProcessing/audioRecorder';
import { getSocketUrl } from '../../utils/socketUrl';
import './BattleSinger.css';

const BattleSingerMode = ({ onBack }) => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState('LOBBY'); // LOBBY, SETUP, RECORDING, PLAYBACK, VOTING, RESULTS
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState({});
  const [challenge, setChallenge] = useState('');
  const [challengeInput, setChallengeInput] = useState('');
  const [recorder, setRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioPlayback, setAudioPlayback] = useState(null);
  const [votes, setVotes] = useState({});
  const [results, setResults] = useState([]);
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
    console.log('Connecting BattleSinger socket to', resolvedSocketUrl);

    newSocket.on('connect', () => {
      console.log('BattleSinger socket connected:', newSocket.id);
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

    newSocket.on('ROOM_CREATED', ({ roomCode: code, playerId }) => {
      setRoomCode(code);
      console.log('✨ Room created:', code);
    });

    newSocket.on('ROOM_JOINED', ({ players: playerList }) => {
      setPlayers(playerList);
    });

    newSocket.on('PLAYERS_UPDATE', ({ players: playerList }) => {
      setPlayers(playerList);
    });

    newSocket.on('GAME_STARTED', ({ gameMode, players: playerList }) => {
      setGameState('SETUP');
      setPlayers(playerList);
    });

    newSocket.on('CHALLENGE_SET', ({ challenge: chal, duration }) => {
      setChallenge(chal);
      setGameState('RECORDING');
    });

    newSocket.on('PLAYBACK_START', ({ players: playerList }) => {
      setGameState('PLAYBACK');
      setPlayers(playerList);
    });

    newSocket.on('RESULTS', ({ results: resultsList }) => {
      setGameState('RESULTS');
      setResults(resultsList);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  // Create or join room
  const handleCreateRoom = () => {
    socket?.emit('CREATE_ROOM', {
      name: currentUser.displayName,
      photoURL: currentUser.photoURL,
    });
    setGameState('WAITING_PLAYERS');
  };

  // Start game
  const handleStartGame = () => {
    socket?.emit('START_BATTLE_SINGER', { roomCode });
  };

  // Set challenge (host only)
  const handleSetChallenge = () => {
    if (challengeInput.trim()) {
      socket?.emit('SET_CHALLENGE', { roomCode, challengeText: challengeInput });
      setChallengeInput('');
    }
  };

  // Recording functions
  const handleStartRecording = async () => {
    const newRecorder = new AudioRecorder({
      maxDuration: 20000,
      onTimeUpdate: (time) => setRecordingTime(time),
    });

    const success = await newRecorder.startRecording();
    if (success) {
      setRecorder(newRecorder);
      setIsRecording(true);
    } else {
      alert('❌ ไม่สามารถเข้าถึงไมโครโฟน');
    }
  };

  const handleStopRecording = async () => {
    if (recorder) {
      const audioData = await recorder.stopRecording();
      if (audioData) {
        const base64Data = await recorder.getBlobAsBase64();
        socket?.emit('AUDIO_FINISHED', {
          roomCode,
          playerId: socket.id,
          audioData: base64Data,
        });
        setIsRecording(false);
        setRecordingTime(0);
      }
    }
  };

  // Playback
  const handlePlayAudio = (audioData) => {
    stopAudio(audioPlayback);
    const audio = playAudio(audioData);
    setAudioPlayback(audio);
  };

  // Voting
  const handleVote = (votedFor) => {
    socket?.emit('VOTE', { roomCode, playerId: socket.id, votedFor });
    setVotes({ ...votes, [socket.id]: votedFor });
  };

  // LOBBY Screen
  if (gameState === 'LOBBY') {
    return (
      <div className="battle-singer-container">
        <button className="back-btn" onClick={onBack}>← ย้อนกลับ</button>
        <h1>🎤 Battle Singer</h1>
        {socketUrl && (
          <div className="socket-info">Socket URL: <code>{socketUrl}</code></div>
        )}
        {socketError && (
          <div className="socket-error">
            <strong>ไม่สามารถเชื่อมต่อเกมเซิร์ฟเวอร์ได้:</strong> {socketError}
            <p>ตรวจสอบค่า <code>REACT_APP_SOCKET_URL</code> หรือ host ของ Socket.io server</p>
          </div>
        )}
        <button className="create-btn" onClick={handleCreateRoom}>สร้างห้องใหม่</button>
      </div>
    );
  }

  // WAITING PLAYERS Screen
  if (gameState === 'WAITING_PLAYERS') {
    return (
      <div className="battle-singer-container">
        {socketError && (
          <div className="socket-error">
            <strong>ไม่สามารถเชื่อมต่อเกมเซิร์ฟเวอร์ได้:</strong> {socketError}
            <p>ตรวจสอบว่า Socket.io server ทำงานและ `REACT_APP_SOCKET_URL` ชี้ไปยัง host ที่ถูกต้อง</p>
          </div>
        )}
        <div className="room-info">
          <h2>รหัสห้อง: <span className="room-code">{roomCode || 'กำลังสร้าง...'}</span></h2>
          <p>🎵 {roomCode ? 'รอเพื่อนเข้าห้อง...' : 'กำลังสร้างห้อง โปรดรอสักครู่...'}</p>
        </div>

        <div className="players-list">
          {Object.values(players).map((p) => (
            <div key={p.id} className="player-item">
              <img src={p.photoURL} alt={p.name} />
              <span>{p.name}</span>
            </div>
          ))}
        </div>

        {Object.keys(players).length > 1 && (
          <button className="start-btn" onClick={handleStartGame}>เริ่มเกม</button>
        )}
      </div>
    );
  }

  // SETUP Screen (Host sets challenge)
  if (gameState === 'SETUP') {
    return (
      <div className="battle-singer-container">
        <h2>⚙️ ตั้งค่าท่วงทำนอง</h2>
        <input
          type="text"
          placeholder="ใส่ชื่อเพลงหรือคำใบ้ทำนอง"
          value={challengeInput}
          onChange={(e) => setChallengeInput(e.target.value)}
          className="challenge-input"
        />
        <button onClick={handleSetChallenge} className="confirm-btn">ตั้งค่า</button>
      </div>
    );
  }

  // RECORDING Screen
  if (gameState === 'RECORDING') {
    return (
      <div className="battle-singer-container">
        <h2>🎵 {challenge}</h2>
        <p>ร้องลอกท่วงทำนองภายใน 20 วินาที!</p>

        <div className="timer">{recordingTime}s / 20s</div>

        {isRecording ? (
          <button className="stop-btn" onClick={handleStopRecording}>⏹️ หยุดอัด</button>
        ) : (
          <button className="record-btn" onClick={handleStartRecording}>🎤 เริ่มอัด</button>
        )}

        <div className="players-recording">
          {Object.values(players).map((p) => (
            <div key={p.id} className="player-recording-item">
              <span>{p.name}</span>
              {p.recordingComplete && <span className="check">✓</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // PLAYBACK Screen
  if (gameState === 'PLAYBACK') {
    return (
      <div className="battle-singer-container">
        <h2>🎬 ฟังเสียงของทั้งหมด</h2>

        <div className="playback-list">
          {Object.values(players).map((p) => (
            <div key={p.id} className="playback-item">
              <button 
                className="play-btn"
                onClick={() => p.audioData && handlePlayAudio(p.audioData)}
              >
                ▶️ {p.name}
              </button>
            </div>
          ))}
        </div>

        <p className="voting-hint">โหวตว่าใครปังสุด ⬇️</p>
      </div>
    );
  }

  // VOTING Screen
  if (gameState === 'VOTING' || (gameState === 'PLAYBACK' && Object.keys(players).length > 0)) {
    return (
      <div className="battle-singer-container">
        <h2>🏆 โหวตสำหรับคนที่ปังสุด</h2>

        <div className="voting-grid">
          {Object.values(players).map((p) => (
            <button
              key={p.id}
              className={`vote-btn ${votes[socket?.id] === p.id ? 'voted' : ''}`}
              onClick={() => handleVote(p.id)}
            >
              <img src={p.photoURL} alt={p.name} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // RESULTS Screen
  if (gameState === 'RESULTS') {
    return (
      <div className="battle-singer-container">
        <h2>🎉 ผลการโหวต</h2>

        <div className="results-list">
          {results.map((result, index) => (
            <div key={result.playerId} className="result-item">
              <span className="rank">{index + 1}</span>
              <span className="name">{result.playerName}</span>
              <span className="votes">⭐ {result.votes} votes</span>
            </div>
          ))}
        </div>

        <div className="action-buttons">
          <button onClick={() => setGameState('WAITING_PLAYERS')}>🔄 เล่นอีกรอบ</button>
          <button onClick={onBack}>← ออกจากห้อง</button>
        </div>
      </div>
    );
  }

  return <div>Loading...</div>;
};

export default BattleSingerMode;
