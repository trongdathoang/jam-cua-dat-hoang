import React, { useEffect, useState } from "react";
import useRoomStore from "./store/roomStore";
import WelcomeModal from "./components/WelcomeModal";
import VideoPlayer from "./components/VideoPlayer";
import VideoSearch from "./components/VideoSearch";
import VideoQueue from "./components/VideoQueue";
import Chat from "./components/Chat";
import RoomInfo from "./components/RoomInfo";
import UserList from "./components/UserList";
import { Film } from "lucide-react";

function App() {
  const { room, user, leaveRoom, rejoinRoom, isLoading } = useRoomStore();
  const [roomIdFromUrl, setRoomIdFromUrl] = useState<string | undefined>(
    undefined
  );
  const [isAttemptingReconnect, setIsAttemptingReconnect] = useState(true);

  // Check for room ID in URL and attempt to rejoin session
  useEffect(() => {
    const attemptRejoin = async () => {
      // Try to rejoin using saved session
      const success = await rejoinRoom();
      if (!success) {
        // If failed to rejoin, check for room ID in URL
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get("room");
        if (roomId) {
          setRoomIdFromUrl(roomId);
        }
      }
      setIsAttemptingReconnect(false);
    };

    attemptRejoin();
  }, [rejoinRoom]);

  // Update page title when room changes
  useEffect(() => {
    if (room) {
      document.title = `${room.name} | JamcuaDatdepzai`;
    } else {
      document.title = "JamcuaDatdepzai";
    }
  }, [room]);

  // Handle beforeunload to leave room
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (room && user) {
        // We now save the session to localStorage instead of leaving the room
        // This allows the user to reconnect after a refresh
        // leaveRoom();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [room, user]);

  // Show loading indicator while attempting to reconnect
  if (isAttemptingReconnect || isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting...</p>
        </div>
      </div>
    );
  }

  // If no room or user, show welcome screen
  if (!room || !user) {
    return <WelcomeModal roomId={roomIdFromUrl} />;
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <header className="border-b border-gray-800 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center">
            <Film className="text-purple-500 mr-2" size={24} />
            <h1 className="text-xl font-bold">JamcuaDatdepzai</h1>
          </div>
          <button
            onClick={() => leaveRoom()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Leave Room
          </button>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content - Video Player */}
          <div className="lg:w-2/3">
            <VideoPlayer />
          </div>

          {/* Sidebar */}
          <div className="lg:w-1/3">
            <RoomInfo />
            <VideoSearch />
            <VideoQueue />
            <UserList />
            <Chat />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
