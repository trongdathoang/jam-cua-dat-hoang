import React, { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Trash2,
  Settings,
} from "lucide-react";
import useRoomStore from "../store/roomStore";
import RoomSettingsModal, { RoomSettings } from "./RoomSettingsModal";

const VideoPlayer: React.FC = () => {
  const {
    room,
    user,
    playVideo,
    pauseVideo,
    seekVideo,
    skipVideo,
    skipCurrentVideo,
    updateRoomSettings,
  } = useRoomStore();
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any | null>(null);
  const [localTime, setLocalTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const syncIntervalRef = useRef<number | null>(null);
  const updateTimeIntervalRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const isSeeking = useRef(false);
  const isDraggingSeekBar = useRef(false);
  const [playerReady, setPlayerReady] = useState(false);
  const initializedRef = useRef(false);
  const volumeControlRef = useRef<HTMLDivElement>(null);

  const currentVideo = room?.currentVideo;
  const isPlaying = room?.isPlaying || false;
  const currentTime = room?.currentTime || 0;
  const isHost = user?.isHost || false;

  // Default settings if none exist in the room
  const defaultSettings: RoomSettings = {
    allowAllPlayPause: false,
    allowAllSkip: false,
    allowAllDelete: false,
    allowAllQueueReorder: false,
  };

  const roomSettings = room?.settings || defaultSettings;

  // Computed permissions based on real-time role and settings
  const canPlay = isHost || roomSettings.allowAllPlayPause;
  const canSkip = isHost || roomSettings.allowAllSkip;
  const canDelete = isHost || roomSettings.allowAllDelete;

  // Close volume slider when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        volumeControlRef.current &&
        !volumeControlRef.current.contains(event.target as Node)
      ) {
        setShowVolumeSlider(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
      }
      if (updateTimeIntervalRef.current) {
        window.clearInterval(updateTimeIntervalRef.current);
      }
    };
  }, []);

  // Set initialized flag when a video is playing
  useEffect(() => {
    if (currentVideo && isPlaying) {
      initializedRef.current = true;
    }
  }, [currentVideo, isPlaying]);

  // Handle play/pause state changes
  useEffect(() => {
    // Only interact with the player if it's ready
    if (!playerRef.current || !playerReady) return;

    try {
      if (isPlaying && playerRef.current.getPlayerState() !== 1) {
        playerRef.current.playVideo();
      } else if (!isPlaying && playerRef.current.getPlayerState() === 1) {
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.error("Error controlling player:", error);
    }
  }, [isPlaying, playerReady]);

  // Handle seeking - more responsive to remote time changes
  useEffect(() => {
    if (
      !playerRef.current ||
      !playerReady ||
      isSeeking.current ||
      isDraggingSeekBar.current
    )
      return;

    // Don't sync if we've just synced recently (avoid feedback loops)
    const now = Date.now();
    if (now - lastSyncTimeRef.current < 1000) return;

    try {
      const playerTime = playerRef.current.getCurrentTime();
      const timeDiff = Math.abs(playerTime - currentTime);

      // Use a smaller threshold for more accurate syncing
      if (timeDiff > 1.5) {
        playerRef.current.seekTo(currentTime);
        lastSyncTimeRef.current = now;
        setLocalTime(currentTime); // Update local UI immediately
      }
    } catch (error) {
      console.error("Error syncing time:", error);
    }
  }, [currentTime, playerReady]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePlayerReady = (event: any) => {
    playerRef.current = event.target;
    setPlayerReady(true);
    console.log("YouTube player ready");

    // Initialize volume from player
    if (playerRef.current) {
      const playerVolume = playerRef.current.getVolume();
      setVolume(playerVolume);
      setIsMuted(playerRef.current.isMuted());
    }

    // Set up more frequent sync interval for hosts
    if (syncIntervalRef.current) {
      window.clearInterval(syncIntervalRef.current);
    }

    syncIntervalRef.current = window.setInterval(() => {
      if (
        !playerRef.current ||
        !playerReady ||
        !isHost ||
        isSeeking.current ||
        isDraggingSeekBar.current
      )
        return;

      try {
        const currentPlayerTime = playerRef.current.getCurrentTime();

        // Only update server if we're the host and time has changed significantly
        if (isHost && Math.abs(currentPlayerTime - currentTime) > 1) {
          seekVideo(currentPlayerTime);
        }
      } catch (error) {
        console.error("Error in sync interval:", error);
      }
    }, 3000); // Sync every 3 seconds (faster sync interval)

    // Set up a separate interval for updating local UI time
    if (updateTimeIntervalRef.current) {
      window.clearInterval(updateTimeIntervalRef.current);
    }

    updateTimeIntervalRef.current = window.setInterval(() => {
      if (!playerRef.current || !playerReady || isDraggingSeekBar.current)
        return;

      try {
        const currentPlayerTime = playerRef.current.getCurrentTime();
        setLocalTime(currentPlayerTime);
      } catch (error) {
        console.error("Error updating local time:", error);
      }
    }, 250); // Update local UI time very frequently (4 times per second)
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleStateChange = (event: any) => {
    // YouTube states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    const playerState = event.data;

    // Handle buffering state
    setIsBuffering(playerState === 3);

    // Only control play/pause if we're the host
    if (!isHost) return;

    if (playerState === 1 && !isPlaying) {
      playVideo();
    } else if (playerState === 2 && isPlaying) {
      pauseVideo();
    } else if (playerState === 0) {
      // Video ended, auto play next
      skipVideo();
    }
  };

  // More responsive seeking behavior
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value, 10);
    setLocalTime(newTime);
    isDraggingSeekBar.current = true;
  };

  const handleSeekCommit = () => {
    if (playerRef.current && playerReady) {
      const newTime = localTime;
      playerRef.current.seekTo(newTime);

      // If host, update for everyone
      if (isHost) {
        seekVideo(newTime);
      }

      lastSyncTimeRef.current = Date.now();
    }

    isDraggingSeekBar.current = false;
    isSeeking.current = false;
  };

  // Improve seeking precision with custom events
  const handleSeekMouseDown = () => {
    isDraggingSeekBar.current = true;
  };

  const handleSeekMouseUp = () => {
    handleSeekCommit();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);

    if (playerRef.current && playerReady) {
      playerRef.current.setVolume(newVolume);

      // Automatically unmute if volume is changed to non-zero
      if (newVolume > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }

      // Automatically mute if volume is set to 0
      if (newVolume === 0 && !isMuted) {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };

  const toggleVolumeSlider = () => {
    setShowVolumeSlider(!showVolumeSlider);
  };

  const toggleMute = () => {
    if (!playerReady) return;

    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
      } else {
        playerRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getDuration = (): number => {
    return playerRef.current && playerReady
      ? playerRef.current.getDuration()
      : 0;
  };

  const handleSaveSettings = (settings: RoomSettings) => {
    updateRoomSettings(settings);
  };

  if (!currentVideo) {
    return (
      <div className="aspect-video w-full bg-gray-900 flex items-center justify-center rounded-lg overflow-hidden">
        <div className="text-center p-8">
          <h3 className="text-xl font-medium text-gray-200 mb-2">
            No video playing
          </h3>
          <p className="text-gray-400">Add a YouTube video to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player w-full flex flex-col">
      <div className="player-container aspect-video bg-black rounded-lg overflow-hidden relative">
        <YouTube
          videoId={currentVideo.id}
          opts={{
            width: "100%",
            height: "100%",
            playerVars: {
              autoplay: 1,
              modestbranding: 1,
              controls: 0, // Hide YouTube controls
              rel: 0,
              fs: 0,
              origin: window.location.origin,
              playsinline: 1,
              enablejsapi: 1,
            },
          }}
          onReady={handlePlayerReady}
          onStateChange={handleStateChange}
          className="absolute inset-0"
        />

        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      <div className="video-controls bg-gray-900 p-4 rounded-b-lg">
        <div className="flex items-center mb-2">
          <button
            onClick={isPlaying ? pauseVideo : playVideo}
            className="p-2 text-white mr-2 hover:bg-gray-800 rounded-full transition-colors"
            disabled={!canPlay}
            title={
              canPlay
                ? isPlaying
                  ? "Pause"
                  : "Play"
                : "Only host can control playback"
            }
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <button
            onClick={skipVideo}
            className="p-2 text-white mr-2 hover:bg-gray-800 rounded-full transition-colors"
            disabled={!canSkip || !room?.queue?.length}
            title={canSkip ? "Skip to next video" : "Only host can skip"}
          >
            <SkipForward size={20} />
          </button>

          <button
            onClick={skipCurrentVideo}
            className="p-2 text-white mr-4 hover:bg-gray-800 rounded-full transition-colors"
            disabled={!canDelete}
            title={
              canDelete
                ? "Remove current video without playing next"
                : "Only host can remove videos"
            }
          >
            <Trash2 size={20} />
          </button>

          <div className="flex-1 flex items-center">
            <span className="text-xs text-gray-400 mr-2 w-12 text-right">
              {formatTime(localTime)}
            </span>
            <input
              type="range"
              min="0"
              max={getDuration() || 100}
              value={localTime}
              onChange={handleSeekChange}
              onMouseDown={handleSeekMouseDown}
              onMouseUp={handleSeekMouseUp}
              onTouchStart={handleSeekMouseDown}
              onTouchEnd={handleSeekMouseUp}
              className="w-full slider-progress h-1.5 appearance-none bg-gray-700 rounded-full flex-1 cursor-pointer"
              disabled={!isHost}
            />
            <span className="text-xs text-gray-400 ml-2 w-12">
              {formatTime(getDuration())}
            </span>
          </div>

          <div ref={volumeControlRef} className="relative mx-2">
            <button
              onClick={toggleVolumeSlider}
              className="p-2 text-white hover:bg-gray-800 rounded-full transition-colors flex items-center"
              title="Volume"
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={20} />
              ) : (
                <Volume2 size={20} />
              )}
              <span className="ml-1 text-xs text-gray-400">{volume}</span>
            </button>

            {showVolumeSlider && (
              <div className="absolute bottom-full mb-2 bg-gray-800 p-3 rounded-lg w-48 shadow-lg z-50">
                <div className="flex items-center pb-2">
                  <button
                    onClick={toggleMute}
                    className="p-1 text-white hover:bg-gray-700 rounded transition-colors"
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <span className="mx-2 text-white text-sm">
                    {isMuted ? "Unmute" : "Mute"}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full slider-progress h-1.5 appearance-none bg-gray-700 rounded-full cursor-pointer"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">0</span>
                  <span className="text-xs text-gray-400">100</span>
                </div>
              </div>
            )}
          </div>

          {isHost && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 text-white hover:bg-gray-800 rounded-full transition-colors"
              title="Room Settings"
            >
              <Settings size={20} />
            </button>
          )}
        </div>

        <div className="video-info">
          <h3 className="text-white font-medium text-sm truncate">
            {currentVideo.title}
          </h3>
        </div>
      </div>

      {/* Settings Modal */}
      {isHost && (
        <RoomSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          initialSettings={roomSettings}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
};

export default VideoPlayer;
