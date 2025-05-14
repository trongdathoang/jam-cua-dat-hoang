import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import useRoomStore from '../store/roomStore';
import { Message } from '../types';

const Chat: React.FC = () => {
  const { room, user, messages, sendMessage } = useRoomStore();
  const [messageText, setMessageText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    sendMessage(messageText);
    setMessageText('');
  };

  if (!room || !user) return null;

  return (
    <div className="chat mt-6">
      <h3 className="text-lg font-semibold text-white mb-2">Chat</h3>
      
      <div 
        ref={chatContainerRef}
        className="chat-messages bg-gray-800 rounded-lg p-3 h-[250px] overflow-y-auto flex flex-col gap-2 mb-2"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm my-auto">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message: Message) => {
            const isCurrentUser = message.userId === user.id;
            
            return (
              <div 
                key={message.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isCurrentUser 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {!isCurrentUser && (
                    <div className="text-xs text-gray-300 font-medium mb-1">
                      {message.userName}
                    </div>
                  )}
                  <p className="text-sm">{message.text}</p>
                  <div className="text-xs text-right mt-1 opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button 
          type="submit"
          disabled={!messageText.trim()}
          className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default Chat;