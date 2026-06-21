import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../config/AuthContext';
import { AudioRecorder, playAudio, stopAudio } from '../../utils/audioProcessing/audioRecorder';
import { getSocketUrl } from '../../utils/socketUrl';
import './BattleSinger.css';

const STORAGE_ROOM_KEY = 'melody_mess_roomCode';
const STORAGE_PLAYER_KEY = 'melody_mess_playerId';

const BattleSingerMode = ({ onBack, initialRoomCode = null }) => {
  const { currentUser } = useAuth();
  const [playerId] = useState(() => {
    let pid = window.localStorage.getItem(STORAGE_PLAYER_KEY);
    if (!pid) {
      pid = `p_${Date.now().toString(36)}_${Math.random().toString(36).substring(2,8)}`;
      window.localStorage.setItem(STORAGE_PLAYER_KEY, pid);
    }
    return pid;
  });
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState('LOBBY'); // LOBBY, SETUP, RECORDING, PLAYBACK, VOTING, RESULTS
  const [roomCode, setRoomCode] = useState(() => {
    return initialRoomCode || window.localStorage.getItem(STORAGE_ROOM_KEY) || null;
  });
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
  const [debugMessage, setDebugMessage] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('LOBBY');
  const [socketUrl, setSocketUrl] = useState(null);
  const [manualSocketUrl, setManualSocketUrl] = useState('https://koppo.onrender.com');
  const [hostId, setHostId] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const [joinRequested, setJoinRequested] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [selectedGameMode, setSelectedGameMode] = useState('battle_singer'); // New: game mode selection
  const isConnected = socket?.connected;
  const playerCount = Object.keys(players).length;
  const isHost = playerId && hostId && playerId === hostId;

  const normalizePlayers = (playerList = {}, roomHostId) => {
    const normalized = {};
    Object.entries(playerList).forEach(([key, player]) => {
      const finalPlayerId = player?.playerId || player?.id || key;
      normalized[finalPlayerId] = {
        ...player,
        id: finalPlayerId,
        playerId: finalPlayerId,
        isHost: player?.isHost || Boolean(roomHostId ? roomHostId === finalPlayerId : player?.isHost),
      };
    });
    return normalized;
  };

  const inferHostId = (playerList, roomHostId) => {
    if (roomHostId) return roomHostId;
    const playersArray = Object.values(playerList || {});
    const hostFromFlag = playersArray.find((p) => p?.isHost);
    const fallbackPlayer = playersArray[0];
    return hostFromFlag?.playerId || hostFromFlag?.id || fallbackPlayer?.playerId || fallbackPlayer?.id || null;
  };

  // Initialize Socket.io
  useEffect(() => {
    const resolvedSocketUrl = getSocketUrl();
    setSocketUrl(resolvedSocketUrl);
    setManualSocketUrl(resolvedSocketUrl || 'https://koppo.onrender.com');
    const newSocket = io(resolvedSocketUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      timeout: 15000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    console.log('Connecting BattleSinger socket to', resolvedSocketUrl);

    newSocket.on('connect', () => {
      console.log('BattleSinger socket connected:', newSocket.id);
      setSocketError(null);
      setSocketId(newSocket.id);
      setDebugMessage(`connect: socket=${newSocket.id}`);
    });

    // Attempt to rejoin room automatically after a reconnect
    newSocket.on('reconnect', (attempt) => {
      console.log('BattleSinger socket reconnected, attempt=', attempt);
      const stored = window.localStorage.getItem(STORAGE_ROOM_KEY);
      if (stored) {
        console.log('Attempting rejoin to room after reconnect', stored);
        newSocket.emit('JOIN_ROOM', {
          roomCode: stored,
          playerId,
          userData: { name: currentUser.displayName, photoURL: currentUser.photoURL },
        });
      }
    });

    newSocket.on('reconnect_error', (err) => {
      console.error('Reconnect error:', err);
      setSocketError('Reconnect failed: ' + (err?.message || String(err)));
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connect error:', error);
      setSocketError(error.message || 'Socket connection failed.');
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setSocketError(error?.message || String(error));
    });

    newSocket.on('ROOM_CREATED', ({ roomCode: code, playerId, hostId: roomHostId, players: playerList }) => {
      const normalizedPlayers = normalizePlayers(playerList, roomHostId);
      const inferredHostId = inferHostId(normalizedPlayers, roomHostId);
      window.localStorage.setItem(STORAGE_ROOM_KEY, code);
      setRoomCode(code);
      setSocketId(newSocket.id);
      setHostId(inferredHostId);
      setPlayers(normalizedPlayers);
      setGameState('WAITING_PLAYERS');
      setJoinRequested(false);
      console.log('✨ Room created:', code, normalizedPlayers, 'host:', inferredHostId, 'socket:', newSocket.id);
    });

    newSocket.on('ROOM_JOINED', ({ players: playerList, roomCode: code, hostId: roomHostId, playerId }) => {
      const normalizedPlayers = normalizePlayers(playerList, roomHostId);
      const inferredHostId = inferHostId(normalizedPlayers, roomHostId);
      if (code) {
        window.localStorage.setItem(STORAGE_ROOM_KEY, code);
        setRoomCode(code);
      }
      setSocketId(newSocket.id);
      setHostId(inferredHostId);
      setPlayers(normalizedPlayers);
      setGameState('WAITING_PLAYERS');
      setJoinRequested(false);
      console.log('👥 Joined room:', code, 'host:', inferredHostId, 'playerId:', playerId, 'socket:', newSocket.id);
    });

    // Update player list when server broadcasts changes
    newSocket.on('PLAYERS_UPDATE', ({ players: playerList, hostId: roomHostId }) => {
      const normalizedPlayers = normalizePlayers(playerList, roomHostId);
      const inferredHostId = inferHostId(normalizedPlayers, roomHostId);
      console.log('PLAYERS_UPDATE received', normalizedPlayers, 'hostId:', inferredHostId, 'rawHostId:', roomHostId);
      setPlayers(normalizedPlayers);
      if (inferredHostId) {
        setHostId(inferredHostId);
      }
    });

    newSocket.on('JOIN_ERROR', ({ message }) => {
      setSocketError(message || 'ไม่สามารถเข้าร่วมห้องได้');
      setGameState('LOBBY');
      setJoinRequested(false);
      setPlayers({});
      window.localStorage.removeItem(STORAGE_ROOM_KEY);
    });

    newSocket.on('START_ERROR', ({ message }) => {
      console.error('START_ERROR received:', message);
      setSocketError(message || 'เริ่มเกมล้มเหลว');
      setDebugMessage(`START_ERROR received: ${message}`);
    });

    newSocket.on('GAME_STARTED', ({ roomCode: payloadRoomCode, gameMode, players: playerList, hostId: roomHostId }) => {
      const normalizedPlayers = normalizePlayers(playerList, roomHostId);
      const inferredHostId = inferHostId(normalizedPlayers, roomHostId);
      const newState = playerId === inferredHostId ? 'SETUP' : 'WAITING_SETUP';
      
      console.log('🎬 GAME_STARTED received', {
        playerId,
        inferredHostId,
        newState,
        playerCount: Object.keys(normalizedPlayers).length,
        currentGameState: gameState,
      });
      
      setHostId(inferredHostId);
      setPlayers(normalizedPlayers);
      setGameState(newState);
      setDebugMessage(`GAME_STARTED: player=${playerId} host=${inferredHostId} state=${newState}`);
      // Don't navigate - stay on same socket connection to receive follow-up events
    });

    newSocket.on('CHALLENGE_SET', ({ challenge: chal, duration }) => {
      setChallenge(chal);
      setGameState('RECORDING');
    });

    // Barking Battle Events
    newSocket.on('BARKING_BATTLE_STARTED', ({ roomCode: payloadRoomCode, duration, players: playerList }) => {
      console.log('🐕 BARKING_BATTLE_STARTED received', { roomCode: payloadRoomCode, duration });
      const normalizedPlayers = normalizePlayers(playerList);
      setPlayers(normalizedPlayers);
      setGameState('RECORDING'); // Players now enter recording mode for barking
      setDebugMessage(`BARKING_BATTLE_STARTED: duration=${duration} players=${Object.keys(normalizedPlayers).length}`);
    });

    newSocket.on('BARK_SCORE_UPDATE', ({ scores }) => {
      console.log('🐕 BARK_SCORE_UPDATE received', scores);
      setDebugMessage(`BARK_SCORE_UPDATE: ${JSON.stringify(scores)}`);
      // Update UI with live scores
      setPlayers((prev) => {
        const updated = { ...prev };
        Object.entries(scores || {}).forEach(([playerId, score]) => {
          if (updated[playerId]) {
            updated[playerId].barkScore = score;
          }
        });
        return updated;
      });
    });

    newSocket.on('BARKING_BATTLE_RESULTS', ({ results }) => {
      console.log('🐕 BARKING_BATTLE_RESULTS received', results);
      setGameState('RESULTS');
      setResults(results);
      setDebugMessage(`BARKING_BATTLE_RESULTS: ${results.length} results`);
    });

    // Chain Karaoke Events
    newSocket.on('CHAIN_KARAOKE_STARTED', ({ roomCode: payloadRoomCode, challenge: chal, currentPlayer, timePerTurn }) => {
      console.log('🎤 CHAIN_KARAOKE_STARTED received', { currentPlayer, timePerTurn });
      setChallenge(chal);
      setGameState('RECORDING');
      setDebugMessage(`CHAIN_KARAOKE_STARTED: current=${currentPlayer} time=${timePerTurn}s`);
    });

    newSocket.on('CHAIN_KARAOKE_NEXT_TURN', ({ nextPlayer, previousAudio, currentTurnIndex, totalPlayers }) => {
      console.log('🎤 CHAIN_KARAOKE_NEXT_TURN received', { nextPlayer, currentTurnIndex, totalPlayers });
      setDebugMessage(`CHAIN_KARAOKE_NEXT_TURN: player ${currentTurnIndex}/${totalPlayers}`);
    });

    newSocket.on('CHAIN_KARAOKE_COMPLETE', ({ audioQueue, originalChallenge }) => {
      console.log('🎤 CHAIN_KARAOKE_COMPLETE received', { queueLength: audioQueue?.length });
      setGameState('PLAYBACK');
      setDebugMessage(`CHAIN_KARAOKE_COMPLETE: ${audioQueue?.length} audios to play`);
    });

    // Classic Karaoke Events
    newSocket.on('CLASSIC_KARAOKE_STARTED', ({ roomCode: payloadRoomCode, challenge: chal, currentPlayer }) => {
      console.log('📞 CLASSIC_KARAOKE_STARTED received');
      setChallenge(chal);
      setGameState('RECORDING');
      setDebugMessage(`CLASSIC_KARAOKE_STARTED: first player=${currentPlayer}`);
    });

    newSocket.on('CLASSIC_KARAOKE_COMPLETE', ({ audioQueue, originalChallenge }) => {
      console.log('📞 CLASSIC_KARAOKE_COMPLETE received');
      setGameState('PLAYBACK');
      setDebugMessage(`CLASSIC_KARAOKE_COMPLETE: ${audioQueue?.length} audios`);
    });

    // Draw The Melody Events
    newSocket.on('DRAW_MELODY_STARTED', ({ roomCode: payloadRoomCode, challenge: chal, hummingPlayer }) => {
      console.log('🎨 DRAW_MELODY_STARTED received', { hummingPlayer });
      setChallenge(chal);
      setGameState('RECORDING');
      setDebugMessage(`DRAW_MELODY_STARTED: hummer=${hummingPlayer}`);
    });

    newSocket.on('HUMMING_COMPLETE', ({ hummingPlayer, readyForDrawing }) => {
      console.log('🎨 HUMMING_COMPLETE received');
      setGameState('RECORDING'); // Switch to drawing mode
      setDebugMessage(`HUMMING_COMPLETE: ready to draw`);
    });

    newSocket.on('ALL_DRAWINGS_COMPLETE', ({ drawings, challenge: chal, hummingAudio }) => {
      console.log('🎨 ALL_DRAWINGS_COMPLETE received', { drawingCount: Object.keys(drawings).length });
      setGameState('RESULTS');
      setDebugMessage(`ALL_DRAWINGS_COMPLETE: ${Object.keys(drawings).length} drawings`);
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
  }, [currentUser]);

  const handleJoinRoom = React.useCallback((code) => {
    if (!socket || !code) return;
    window.localStorage.setItem(STORAGE_ROOM_KEY, code);
    setSocketError(null);
    setJoinRequested(true);
    setHasJoinedRoom(true);
    socket.emit('JOIN_ROOM', {
      roomCode: code,
      playerId,
      userData: {
        name: currentUser.displayName,
        photoURL: currentUser.photoURL,
      },
    });
    setRoomCode(code);
    setGameState('WAITING_PLAYERS');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, currentUser, playerId]);

  useEffect(() => {
    if (!socket || !initialRoomCode || joinRequested || hasJoinedRoom) return;

    const attemptJoin = () => handleJoinRoom(initialRoomCode);

    if (socket.connected) {
      attemptJoin();
      return;
    }

    socket.once('connect', attemptJoin);
    return () => {
      if (socket && socket.off) {
        socket.off('connect', attemptJoin);
      }
    };
  }, [socket, initialRoomCode, joinRequested, hasJoinedRoom, handleJoinRoom]);

  // Auto-rejoin if roomCode is stored (user refreshed while in game)
  useEffect(() => {
    if (!socket || initialRoomCode || joinRequested || hasJoinedRoom) return;
    
    const storedRoomCode = window.localStorage.getItem(STORAGE_ROOM_KEY);
    if (!storedRoomCode) return;

    const attemptAutoJoin = () => {
      console.log('Auto-joining stored room:', storedRoomCode);
      handleJoinRoom(storedRoomCode);
    };

    if (socket.connected) {
      attemptAutoJoin();
      return;
    }

    socket.once('connect', attemptAutoJoin);
    return () => {
      if (socket && socket.off) {
        socket.off('connect', attemptAutoJoin);
      }
    };
  }, [socket, initialRoomCode, joinRequested, hasJoinedRoom, handleJoinRoom]);

  // Create or join room
  const handleCreateRoom = () => {
    socket?.emit('CREATE_ROOM', {
      playerId,
      userData: { name: currentUser.displayName, photoURL: currentUser.photoURL },
    });
    setGameState('WAITING_PLAYERS');
  };

  useEffect(() => {
    setCurrentScreen(gameState);
  }, [gameState]);

  // Start game
  const handleStartGame = () => {
    setDebugMessage(`handleStartGame clicked: mode=${selectedGameMode} roomCode=${roomCode} playerId=${playerId} hostId=${hostId} isHost=${isHost} socketId=${socket?.id}`);
    if (!socket?.connected) {
      setSocketError('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์ โปรดลองใหม่อีกครั้ง');
      return;
    }
    if (!roomCode) {
      setSocketError('ไม่พบรหัสห้อง โปรดเข้าห้องก่อนเริ่มเกม');
      return;
    }
    if (!isHost) {
      setSocketError('เฉพาะเจ้าของห้องเท่านั้นที่สามารถเริ่มเกมได้');
      return;
    }
    
    console.log('handleStartGame', { roomCode, playerId, hostId, isHost, socketId: socket.id, gameMode: selectedGameMode });
    
    // Send appropriate event based on selected game mode
    switch(selectedGameMode) {
      case 'barking_battle':
        console.log('Starting BARKING_BATTLE');
        socket.emit('START_BARKING_BATTLE', { roomCode, playerId }, (response) => {
          console.log('START_BARKING_BATTLE ack', response);
          setDebugMessage(`START_BARKING_BATTLE ack: ${JSON.stringify(response)}`);
          if (response?.ok !== true) {
            setSocketError(response?.message || 'เริ่มเกมล้มเหลว');
          }
        });
        break;
      case 'chain_karaoke':
        console.log('Starting CHAIN_KARAOKE');
        socket.emit('START_CHAIN_KARAOKE', { roomCode, challenge: 'สวนกล่อมกันหักระเบิด', playerId }, (response) => {
          console.log('START_CHAIN_KARAOKE ack', response);
          setDebugMessage(`START_CHAIN_KARAOKE ack: ${JSON.stringify(response)}`);
          if (response?.ok !== true) {
            setSocketError(response?.message || 'เริ่มเกมล้มเหลว');
          }
        });
        break;
      case 'classic_karaoke':
        console.log('Starting CLASSIC_KARAOKE');
        socket.emit('START_CLASSIC_KARAOKE', { roomCode, challenge: 'Attack on Titan Opening', playerId }, (response) => {
          console.log('START_CLASSIC_KARAOKE ack', response);
          setDebugMessage(`START_CLASSIC_KARAOKE ack: ${JSON.stringify(response)}`);
          if (response?.ok !== true) {
            setSocketError(response?.message || 'เริ่มเกมล้มเหลว');
          }
        });
        break;
      case 'draw_melody':
        console.log('Starting DRAW_MELODY');
        socket.emit('START_DRAW_MELODY', { roomCode, challenge: 'เพลง Naruto Opening', playerId }, (response) => {
          console.log('START_DRAW_MELODY ack', response);
          setDebugMessage(`START_DRAW_MELODY ack: ${JSON.stringify(response)}`);
          if (response?.ok !== true) {
            setSocketError(response?.message || 'เริ่มเกมล้มเหลว');
          }
        });
        break;
      case 'battle_singer':
      default:
        console.log('Starting BATTLE_SINGER');
        socket.emit('START_BATTLE_SINGER', { roomCode, playerId }, (response) => {
          console.log('START_BATTLE_SINGER ack', response);
          setDebugMessage(`START_BATTLE_SINGER ack: ${JSON.stringify(response)}`);
          if (response?.ok !== true) {
            setSocketError(response?.message || 'เริ่มเกมล้มเหลว');
          }
        });
    }
  };

  // Set challenge (host only)
  const handleSetChallenge = () => {
    if (challengeInput.trim()) {
      socket?.emit('SET_CHALLENGE', { roomCode, challengeText: challengeInput });
      setChallengeInput('');
    }
  };

  const handleSaveSocketUrl = () => {
    if (!manualSocketUrl) {
      setSocketError('โปรดกรอก Socket URL ก่อนบันทึก');
      return;
    }
    window.localStorage.setItem('REACT_APP_SOCKET_URL', manualSocketUrl);
    window.location.reload();
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
          playerId,
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
    socket?.emit('VOTE', { roomCode, playerId, votedFor });
    setVotes({ ...votes, [playerId]: votedFor });
  };

  // LOBBY Screen
  const renderDebugPanel = () => (
    <div className="debug-panel" style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      zIndex: 999,
      background: 'rgba(0,0,0,0.85)',
      color: '#fff',
      padding: '10px',
      fontSize: '12px',
      maxWidth: '320px',
      lineHeight: '1.4',
    }}>
      <div><strong>DEBUG PANEL</strong></div>
      <div>screen: {currentScreen}</div>
      <div>roomCode: {roomCode || '-'}</div>
      <div>playerId: {playerId}</div>
      <div>hostId: {hostId || '-'}</div>
      <div>isHost: {isHost ? 'yes' : 'no'}</div>
      <div>socketId: {socketId || '-'}</div>
      <div>connected: {isConnected ? 'yes' : 'no'}</div>
      <div>players: {playerCount}</div>
      {debugMessage && <div>msg: {debugMessage}</div>}
      {socketError && <div style={{ color: 'lightpink' }}>error: {socketError}</div>}
    </div>
  );

  if (gameState === 'LOBBY') {
    return (
      <div className="battle-singer-container">
        <button className="back-btn" onClick={onBack}>← ย้อนกลับ</button>
        <h1>🎤 Battle Singer</h1>
        {socketUrl && (
          <div className="socket-info">Socket URL: <code>{socketUrl}</code></div>
        )}
        <div className="socket-override">
          <label htmlFor="socket-url-input">ตั้งค่า Socket URL</label>
          <input
            id="socket-url-input"
            type="text"
            value={manualSocketUrl}
            onChange={(e) => setManualSocketUrl(e.target.value)}
            className="socket-url-input"
            placeholder="https://koppo.onrender.com"
          />
          <button className="save-socket-url-btn" onClick={handleSaveSocketUrl}>Save Socket URL</button>
          <small>ถ้าปัจจุบันไม่เชื่อมต่อ ให้บันทึกและรีโหลด</small>
        </div>
        {socketError && (
          <div className="socket-error">
            <strong>ไม่สามารถเชื่อมต่อเกมเซิร์ฟเวอร์ได้:</strong> {socketError}
            <p>ตรวจสอบค่า <code>REACT_APP_SOCKET_URL</code> หรือ host ของ Socket.io server</p>
          </div>
        )}
        <button className="create-btn" onClick={handleCreateRoom}>สร้างห้องใหม่</button>
      {renderDebugPanel()}
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

        {Object.keys(players).length > 1 ? (
          isHost ? (
            <>
              <div className="host-badge">คุณคือเจ้าของห้อง</div>
              
              {/* Game Mode Selector */}
              <div className="game-mode-selector" style={{ margin: '20px 0', padding: '15px', border: '2px solid #FF6B6B', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>เลือกโหมดเกม:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="gameMode"
                      value="barking_battle"
                      checked={selectedGameMode === 'barking_battle'}
                      onChange={(e) => setSelectedGameMode(e.target.value)}
                    />
                    <span>🐶 โฮ่งฮับแชมเปียนชิป (Barking Battle)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="gameMode"
                      value="chain_karaoke"
                      checked={selectedGameMode === 'chain_karaoke'}
                      onChange={(e) => setSelectedGameMode(e.target.value)}
                    />
                    <span>🎤 คาราโอเกะสายพาน (Chain Melody)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="gameMode"
                      value="classic_karaoke"
                      checked={selectedGameMode === 'classic_karaoke'}
                      onChange={(e) => setSelectedGameMode(e.target.value)}
                    />
                    <span>📞 คาราโอเกะโทรศัพท์เสีย (Classic Karaoke)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="gameMode"
                      value="draw_melody"
                      checked={selectedGameMode === 'draw_melody'}
                      onChange={(e) => setSelectedGameMode(e.target.value)}
                    />
                    <span>🎨 ทายใจเสียงฮัม (Draw The Melody)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="gameMode"
                      value="battle_singer"
                      checked={selectedGameMode === 'battle_singer'}
                      onChange={(e) => setSelectedGameMode(e.target.value)}
                    />
                    <span>🎸 Battle Singer (เกมเก่า)</span>
                  </label>
                </div>
              </div>

              <button className="start-btn" type="button" onClick={() => {
                console.log('start button clicked', { roomCode, playerId, hostId, isHost, gameState, players, selectedGameMode });
                handleStartGame();
              }}>
                เริ่มเกม ({selectedGameMode})
              </button>
            </>
          ) : (
            <p className="waiting-text">รอให้เจ้าของห้องเริ่มเกม</p>
          )
        ) : (
          <p className="waiting-text">รอให้เพื่อนเข้าห้องอย่างน้อย 1 คนเพื่อเริ่มเกม</p>
        )}
        {!isConnected && (
          <p className="socket-warning">ยังไม่เชื่อมต่อเซิร์ฟเวอร์เกม โปรดรอสักครู่</p>
        )}
        {debugMessage && (
          <div className="debug-message">
            <strong>DEBUG:</strong> {debugMessage}
          </div>
        )}
      {renderDebugPanel()}
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
      {renderDebugPanel()}
      </div>
    );
  }

  if (gameState === 'WAITING_SETUP') {
    return (
      <div className="battle-singer-container">
        <h2>⌛ รอเจ้าของห้องตั้งค่าท้าทาย</h2>
        <p>เจ้าของห้องกำลังเตรียมคำสั่งร้อง</p>
        <div className="players-list">
          {Object.values(players).map((p) => (
            <div key={p.id} className="player-item">
              <img src={p.photoURL} alt={p.name} />
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      {renderDebugPanel()}
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
      {renderDebugPanel()}
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
      {renderDebugPanel()}
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
      {renderDebugPanel()}
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
      {renderDebugPanel()}
      </div>
    );
  }

  return <div>Loading...</div>;
};

export default BattleSingerMode;
