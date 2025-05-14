export interface User {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
}

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  addedBy: string;
  addedAt: number;
}

export interface Room {
  id: string;
  name: string;
  createdAt: number;
  hostId: string;
  currentVideo: VideoInfo | null;
  queue: VideoInfo[];
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: number;
  users: Record<string, User>;
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface RoomState {
  room: Room | null;
  user: User | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  createRoom: (name: string, userName: string) => Promise<string>;
  joinRoom: (roomId: string, userName: string) => Promise<void>;
  rejoinRoom: () => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  addVideo: (
    videoId: string,
    title: string,
    thumbnail: string
  ) => Promise<void>;
  removeVideo: (videoId: string) => Promise<void>;
  playVideo: () => Promise<void>;
  pauseVideo: () => Promise<void>;
  seekVideo: (time: number) => Promise<void>;
  skipVideo: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  // Internal methods
  setupRoomListeners: (roomId: string, userId: string) => void;
  cleanupRoomListeners: () => void;
  // New methods
  skipCurrentVideo: () => Promise<void>;
  playVideoFromQueue: (videoId: string) => Promise<void>;
  reorderQueue: (newQueue: VideoInfo[]) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  transferHost: (userId: string) => Promise<void>;
}
