import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BattleSingerMode from '../../components/MelodyMess/BattleSingerMode';

const MelodyMessGame = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{ height: '100%' }}>
      <BattleSingerMode
        onBack={() => navigate('/melody-mess')}
        initialRoomCode={roomCode}
      />
    </div>
  );
};

export default MelodyMessGame;
