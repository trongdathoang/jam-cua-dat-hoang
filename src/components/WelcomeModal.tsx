import React, { useState, useEffect } from "react";
import { Film } from "lucide-react";
import useRoomStore from "../store/roomStore";

interface WelcomeModalProps {
  roomId?: string;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ roomId }) => {
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [mode, setMode] = useState<"join" | "create">(
    roomId ? "join" : "create"
  );
  const { createRoom, joinRoom, error, isLoading } = useRoomStore();

  useEffect(() => {
    if (roomId) {
      setMode("join");
    }
  }, [roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (mode === "create") {
        await createRoom(roomName, name);
      } else {
        await joinRoom(roomId || "", name);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-800 bg-opacity-75 z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="bg-purple-600 rounded-full p-4 inline-block">
            <Film size={32} className="text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-6">
          JamcuaDatdepzai
        </h2>

        {!roomId && (
          <div className="mb-6">
            <div className="flex bg-gray-800 rounded-lg overflow-hidden">
              <button
                className={`flex-1 py-3 text-center ${
                  mode === "create"
                    ? "bg-purple-600 text-white"
                    : "text-gray-300 hover:text-white"
                } transition-colors`}
                onClick={() => setMode("create")}
              >
                Create Room
              </button>
              <button
                className={`flex-1 py-3 text-center ${
                  mode === "join"
                    ? "bg-purple-600 text-white"
                    : "text-gray-300 hover:text-white"
                } transition-colors`}
                onClick={() => setMode("join")}
              >
                Join Room
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
              className="w-full p-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {mode === "create" && (
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                required
                className="w-full p-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {mode === "join" && !roomId && (
            <div className="p-3 bg-yellow-500 bg-opacity-20 text-yellow-300 rounded-lg text-sm">
              A room ID is required to join. Please use a room invite link.
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500 bg-opacity-20 text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              (mode === "join" && !roomId) ||
              !name ||
              (mode === "create" && !roomName)
            }
            className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? "Please wait..."
              : mode === "create"
              ? "Create Room"
              : "Join Room"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WelcomeModal;
