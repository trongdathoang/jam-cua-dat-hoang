import React, { useState } from 'react';
import { Users, Copy, CheckCheck } from 'lucide-react';
import useRoomStore from '../store/roomStore';

const RoomInfo: React.FC = () => {
  const { room, user } = useRoomStore();
  const [linkCopied, setLinkCopied] = useState(false);
  
  if (!room) return null;
  
  const roomUrl = `${window.location.origin}?room=${room.id}`;
  const usersCount = Object.keys(room.users).length;
  
  const copyRoomLink = () => {
    navigator.clipboard.writeText(roomUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  
  return (
    <div className="room-info bg-gray-800 p-4 rounded-lg mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-white">{room.name}</h2>
        <div className="flex items-center text-gray-300">
          <Users size={16} className="mr-1" />
          <span className="text-sm">{usersCount}</span>
        </div>
      </div>
      
      <div className="text-sm text-gray-400">
        Room ID: {room.id}
        {user?.isHost && <span className="ml-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">Host</span>}
      </div>
      
      <div className="mt-4">
        <div className="text-sm text-gray-300 mb-1">Share this room:</div>
        <div className="flex">
          <input
            type="text"
            value={roomUrl}
            readOnly
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-l-lg text-sm focus:outline-none"
          />
          <button
            onClick={copyRoomLink}
            className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-r-lg transition-colors"
          >
            {linkCopied ? <CheckCheck size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomInfo;