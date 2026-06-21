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
  const roomCodeRef = React.useRef(roomCode);
  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);
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

  const [selectedGameMode, setSelectedGameMode] = useState('battle_singer');
  const [countdown, setCountdown] = useState(3);
  const [battleActive, setBattleActive] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [voiceActive, setVoiceActive] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({}); // { playerId: MediaStream }
  const peerConnectionsRef = React.useRef({}); // { playerId: RTCPeerConnection }
  const localStreamRef = React.useRef(null);
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

  // Bow-wow Battle (Barking Battle) Countdown & Audio Analysis logic
  useEffect(() => {
    if (gameState !== 'BOW_WOW_BATTLE') return;

    setCountdown(3);
    setBattleActive(false);
    setCurrentVolume(0);

    let cdTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(cdTimer);
          setBattleActive(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(cdTimer);
  }, [gameState]);

  useEffect(() => {
    if (!battleActive) return;

    setRecordingTime(15);
    let gameTimer = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev <= 1) {
          clearInterval(gameTimer);
          setBattleActive(false);
          if (isHost && socket) {
            console.log('⏰ Timer expired. Host ending Barking Battle.');
            socket.emit('END_BARKING_BATTLE', { roomCode });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let javascriptNode = null;
    let stream = null;

    const startVolumeAnalysis = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        let lastEmit = Date.now();

        javascriptNode.onaudioprocess = () => {
          const array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
          let values = 0;

          const length = array.length;
          for (let i = 0; i < length; i++) {
            values += array[i];
          }

          const average = values / length;
          const volume = Math.round(average);
          setCurrentVolume(volume);

          const now = Date.now();
          if (volume > 15 && now - lastEmit > 200) {
            const points = Math.min(Math.round(volume / 5), 10);
            if (socket) {
              socket.emit('SUBMIT_BARK', { roomCode, playerId, points });
            }
            lastEmit = now;
          }
        };
      } catch (err) {
        console.error('Error accessing microphone for volume meter:', err);
      }
    };

    startVolumeAnalysis();

    return () => {
      clearInterval(gameTimer);
      if (javascriptNode) javascriptNode.disconnect();
      if (microphone) microphone.disconnect();
      if (analyser) analyser.disconnect();
      if (audioContext) audioContext.close();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [battleActive, socket, roomCode, playerId, isHost]);

  // Cleanup peer connections when leaving battle
  const cleanupWebRTC = React.useCallback(() => {
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    peerConnectionsRef.current = {};
    setRemoteStreams({});
    setVoiceActive(false);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  }, []);

  // Create a WebRTC peer connection to a specific player
  const createPeerConnection = React.useCallback((targetPlayerId, localStream, socketRef) => {
    if (peerConnectionsRef.current[targetPlayerId]) return peerConnectionsRef.current[targetPlayerId];

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Add local audio tracks
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    // ICE candidates -> send via socket
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef) {
        socketRef.emit('WEBRTC_ICE_CANDIDATE', {
          roomCode: roomCodeRef.current,
          targetPlayerId,
          candidate: event.candidate,
          fromPlayerId: playerId,
        });
      }
    };

    // Remote stream received -> play audio
    pc.ontrack = (event) => {
      console.log(`🔊 WebRTC track received from ${targetPlayerId}`);
      setRemoteStreams((prev) => ({ ...prev, [targetPlayerId]: event.streams[0] }));
    };

    peerConnectionsRef.current[targetPlayerId] = pc;
    return pc;
  }, [playerId, roomCodeRef]);

  // WebRTC session start when battle becomes active
  useEffect(() => {
    if (!battleActive || !socket) return;

    let isMounted = true;
    const currentSocket = socket;

    const startWebRTCVoice = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        if (isMounted) setVoiceActive(true);

        // Ask existing peers to send us offers
        currentSocket.emit('WEBRTC_REQUEST_ALL_PEERS', {
          roomCode: roomCodeRef.current,
          fromPlayerId: playerId,
        });

        // When an existing peer gets notified of us and sends an offer
        const handleOffer = async ({ offer, fromPlayerId: offerFrom }) => {
          if (!isMounted) return;
          const pc = createPeerConnection(offerFrom, stream, currentSocket);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          currentSocket.emit('WEBRTC_ANSWER', {
            roomCode: roomCodeRef.current,
            targetPlayerId: offerFrom,
            answer,
            fromPlayerId: playerId,
          });
        };

        // When a new peer joins the room, we create an offer to them
        const handlePeerJoined = async ({ newPlayerId }) => {
          if (!isMounted || newPlayerId === playerId) return;
          const pc = createPeerConnection(newPlayerId, stream, currentSocket);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          currentSocket.emit('WEBRTC_OFFER', {
            roomCode: roomCodeRef.current,
            targetPlayerId: newPlayerId,
            offer,
            fromPlayerId: playerId,
          });
        };

        const handleAnswer = async ({ answer, fromPlayerId: answerFrom }) => {
          const pc = peerConnectionsRef.current[answerFrom];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          }
        };

        const handleIceCandidate = async ({ candidate, fromPlayerId: from }) => {
          const pc = peerConnectionsRef.current[from];
          if (pc && candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        };

        currentSocket.on('WEBRTC_OFFER', handleOffer);
        currentSocket.on('WEBRTC_PEER_JOINED', handlePeerJoined);
        currentSocket.on('WEBRTC_ANSWER', handleAnswer);
        currentSocket.on('WEBRTC_ICE_CANDIDATE', handleIceCandidate);

        return () => {
          isMounted = false;
          currentSocket.off('WEBRTC_OFFER', handleOffer);
          currentSocket.off('WEBRTC_PEER_JOINED', handlePeerJoined);
          currentSocket.off('WEBRTC_ANSWER', handleAnswer);
          currentSocket.off('WEBRTC_ICE_CANDIDATE', handleIceCandidate);
          cleanupWebRTC();
        };
      } catch (err) {
        console.error('WebRTC voice chat error:', err);
      }
    };

    const cleanup = startWebRTCVoice();
    return () => { cleanup.then((fn) => fn && fn()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleActive]);

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
      
      const currentCode = roomCodeRef.current || window.localStorage.getItem(STORAGE_ROOM_KEY);
      if (currentCode) {
        console.log('Auto-joining room on connect/reconnect:', currentCode);
        newSocket.emit('JOIN_ROOM', {
          roomCode: currentCode,
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

    newSocket.on('ROOM_CREATED', ({ roomCode: code, playerId: roomPlayerId, hostId: roomHostId, players: playerList, gameState: serverGameState, gameMode: serverGameMode, challenge: serverChallenge }) => {
      console.log('✨ ROOM_CREATED received from backend', { code, playerId: roomPlayerId, roomHostId, playerCount: Object.keys(playerList).length });
      const normalizedPlayers = normalizePlayers(playerList, roomHostId);
      const inferredHostId = inferHostId(normalizedPlayers, roomHostId);
      window.localStorage.setItem(STORAGE_ROOM_KEY, code);
      setRoomCode(code);
      setSocketId(newSocket.id);
      setHostId(inferredHostId);
      setPlayers(normalizedPlayers);
      
      const isPlayerHost = playerId === inferredHostId;
      if (serverGameState && serverGameState !== 'WAITING') {
        const clientState = serverGameState === 'SETUP' ? (isPlayerHost ? 'SETUP' : 'WAITING_SETUP') : serverGameState;
        setGameState(clientState);
      } else {
        setGameState('WAITING_PLAYERS');
      }
      if (serverGameMode) {
        setSelectedGameMode(serverGameMode);
      }
      if (serverChallenge) {
        setChallenge(serverChallenge);
      }
      console.log('✨ Room created result:', {
        code,
        normalizedPlayers,
        receivedHostId: roomHostId,
        inferredHostId,
        localPlayerId: roomPlayerId,
        socketId: newSocket.id,
        isHostCheck: playerId === inferredHostId
      });
    });

    newSocket.on('ROOM_JOINED', ({ players: playerList, roomCode: code, hostId: roomHostId, playerId: joinedPid, gameState: serverGameState, gameMode: serverGameMode, challenge: serverChallenge }) => {
      console.log('👥 ROOM_JOINED received from backend', { code, roomHostId, playerCount: Object.keys(playerList).length });
      const normalizedPlayers = normalizePlayers(playerList, roomHostId);
      const inferredHostId = inferHostId(normalizedPlayers, roomHostId);
      if (code) {
        window.localStorage.setItem(STORAGE_ROOM_KEY, code);
        setRoomCode(code);
      }
      setSocketId(newSocket.id);
      setHostId(inferredHostId);
      setPlayers(normalizedPlayers);
      
      const isPlayerHost = playerId === inferredHostId;
      if (serverGameState && serverGameState !== 'WAITING') {
        const clientState = serverGameState === 'SETUP' ? (isPlayerHost ? 'SETUP' : 'WAITING_SETUP') : serverGameState;
        setGameState(clientState);
      } else {
        setGameState('WAITING_PLAYERS');
      }
      if (serverGameMode) {
        setSelectedGameMode(serverGameMode);
      }
      if (serverChallenge) {
        setChallenge(serverChallenge);
      }
      console.log('👥 Room joined result:', {
        code,
        normalizedPlayers,
        receivedHostId: roomHostId,
        inferredHostId,
        joinedPlayerId: joinedPid,
        socketId: newSocket.id,
        isHostCheck: playerId === inferredHostId
      });
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
      setGameState('BOW_WOW_BATTLE'); // Custom screen!
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);





  // Create or join room
  const handleCreateRoom = () => {
    console.log('🏠 handleCreateRoom called', { playerId, currentUserName: currentUser.displayName, socketId: socket?.id, socketConnected: socket?.connected });
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
    setDebugMessage(`handleStartGame clicked: mode=${selectedGameMode} roomCode=${roomCode} playerId=${playerId} hostId=${hostId} isHost=${isHost} socketId=${socket?.id} connected=${socket?.connected}`);
    console.log('🎮 handleStartGame called', { selectedGameMode, roomCode, playerId, hostId, isHost, socketConnected: socket?.connected, socketId: socket?.id });
    
    if (!socket?.connected) {
      console.log('❌ Socket not connected');
      setSocketError('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์ โปรดลองใหม่อีกครั้ง');
      return;
    }
    if (!roomCode) {
      console.log('❌ No roomCode');
      setSocketError('ไม่พบรหัสห้อง โปรดเข้าห้องก่อนเริ่มเกม');
      return;
    }
    if (!isHost) {
      console.log('❌ Not host', { isHost, hostId, playerId });
      setSocketError('เฉพาะเจ้าของห้องเท่านั้นที่สามารถเริ่มเกมได้');
      return;
    }
    
    console.log('✅ All checks passed, emitting START_BARKING_BATTLE', { roomCode, playerId, mode: selectedGameMode });
    
    // Send appropriate event based on selected game mode
    switch(selectedGameMode) {
      case 'barking_battle':
        console.log('🐕 Emitting START_BARKING_BATTLE', { roomCode, playerId });
        socket.emit('START_BARKING_BATTLE', { roomCode, playerId }, (response) => {
          console.log('🐕 START_BARKING_BATTLE ack', response);
          setDebugMessage(`START_BARKING_BATTLE ack: ${JSON.stringify(response)}`);
          if (response?.ok !== true) {
            console.log('❌ START_BARKING_BATTLE failed', response);
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
        <button 
          className="back-btn" 
          onClick={() => {
            if (socket && roomCode) {
              socket.emit('LEAVE_ROOM', { roomCode, playerId });
            }
            window.localStorage.removeItem(STORAGE_ROOM_KEY);
            onBack();
          }}
        >
          ← ออกจากห้อง
        </button>
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
                    <span>🐶 Bow-wow Battle (แข่งกันเห่าโฮ่ง!)</span>
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
        <button 
          className="back-btn" 
          onClick={() => {
            if (socket && roomCode) {
              socket.emit('LEAVE_ROOM', { roomCode, playerId });
            }
            window.localStorage.removeItem(STORAGE_ROOM_KEY);
            onBack();
          }}
        >
          ← ออกจากห้อง
        </button>
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
        <button 
          className="back-btn" 
          onClick={() => {
            if (socket && roomCode) {
              socket.emit('LEAVE_ROOM', { roomCode, playerId });
            }
            window.localStorage.removeItem(STORAGE_ROOM_KEY);
            onBack();
          }}
        >
          ← ออกจากห้อง
        </button>
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
        <button 
          className="back-btn" 
          onClick={() => {
            if (socket && roomCode) {
              socket.emit('LEAVE_ROOM', { roomCode, playerId });
            }
            window.localStorage.removeItem(STORAGE_ROOM_KEY);
            onBack();
          }}
        >
          ← ออกจากห้อง
        </button>
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
        <button 
          className="back-btn" 
          onClick={() => {
            if (socket && roomCode) {
              socket.emit('LEAVE_ROOM', { roomCode, playerId });
            }
            window.localStorage.removeItem(STORAGE_ROOM_KEY);
            onBack();
          }}
        >
          ← ออกจากห้อง
        </button>
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
        <button 
          className="back-btn" 
          onClick={() => {
            if (socket && roomCode) {
              socket.emit('LEAVE_ROOM', { roomCode, playerId });
            }
            window.localStorage.removeItem(STORAGE_ROOM_KEY);
            onBack();
          }}
        >
          ← ออกจากห้อง
        </button>
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

  // BOW WOW BATTLE Screen
  if (gameState === 'BOW_WOW_BATTLE') {
    return (
      <div className="battle-singer-container">
        {/* Hidden audio elements — one per remote peer to play their voice */}
        {Object.entries(remoteStreams).map(([pid, stream]) => (
          <audio
            key={pid}
            autoPlay
            playsInline
            ref={(el) => {
              if (el && el.srcObject !== stream) {
                el.srcObject = stream;
              }
            }}
          />
        ))}

        <button 
          className="back-btn" 
          onClick={() => {
            cleanupWebRTC();
            if (socket && roomCode) {
              socket.emit('LEAVE_ROOM', { roomCode, playerId });
            }
            window.localStorage.removeItem(STORAGE_ROOM_KEY);
            onBack();
          }}
        >
          ← ออกจากห้อง
        </button>
        <h1>🐶 Bow-wow Battle</h1>
        <p>หมาเห่าแข่งกัน! ตะโกนหรือเห่าเลียนเสียงสุนัขให้ดังกว่าคู่แข่งใน 15 วินาที!</p>

        {voiceActive && (
          <div style={{
            textAlign: 'center',
            background: 'rgba(46, 213, 115, 0.25)',
            border: '1px solid #2ed573',
            borderRadius: '8px',
            padding: '6px 14px',
            display: 'inline-block',
            margin: '0 auto 10px',
            fontSize: '14px',
            fontWeight: 'bold',
          }}>
            🎙️ เสียงเปิดอยู่ — ได้ยินเสียงของผู้เล่นอื่นแล้ว!
          </div>
        )}

        {!battleActive && countdown > 0 ? (
          <div className="bow-wow-countdown-container">
            <div className="countdown-title">เตรียมตัวให้พร้อม...</div>
            <div className="countdown-number">{countdown}</div>
          </div>
        ) : (
          <>
            <div className="bow-wow-battle-timer">
              ⏱️ {recordingTime}s
            </div>

            <div className="bark-leaderboard">
              <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>🏆 คะแนนความดังสะสม</h3>
              {Object.values(players).map((p) => {
                const score = p.barkScore || 0;
                const maxScore = Math.max(...Object.values(players).map((pl) => pl.barkScore || 0), 100);
                const percent = Math.min((score / maxScore) * 100, 100);
                return (
                  <div key={p.id} className="bark-player-row">
                    <div className="bark-player-info">
                      <span>{p.name} {p.id === playerId ? '(คุณ)' : ''}</span>
                      <span>🔊 {score}</span>
                    </div>
                    <div className="bark-bar-outer">
                      <div className="bark-bar-inner" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {battleActive && (
              <div className="local-volume-container">
                <div>🎙️ ระดับเสียงเห่าของคุณในปัจจุบัน:</div>
                <div className="volume-meter-wrapper">
                  <div className="volume-meter-fill" style={{ width: `${Math.min((currentVolume / 100) * 100, 100)}%` }}></div>
                  <div className="volume-meter-label">{currentVolume}</div>
                </div>
              </div>
            )}
          </>
        )}
      {renderDebugPanel()}
      </div>
    );
  }

  // RESULTS Screen
  if (gameState === 'RESULTS') {
    return (
      <div className="battle-singer-container">
        <h2>🎉 {selectedGameMode === 'barking_battle' ? 'สรุปคะแนนผู้ชนะ!' : 'ผลการโหวต'}</h2>

        <div className="results-list">
          {results.map((result, index) => (
            <div key={result.playerId} className="result-item">
              <span className="rank">{index + 1}</span>
              <span className="name">{result.playerName}</span>
              {selectedGameMode === 'barking_battle' ? (
                <span className="votes">🔊 {result.score || 0} คะแนน</span>
              ) : (
                <span className="votes">⭐ {result.votes || 0} votes</span>
              )}
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
