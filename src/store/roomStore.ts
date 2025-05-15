import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  ref,
  set as dbSet,
  onValue,
  update,
  remove,
  push,
  get as dbGet,
  off,
} from "firebase/database";
import { database } from "../firebase/config";
import {
  RoomState,
  Room,
  User,
  Message,
  VideoInfo,
  RoomSettings,
} from "../types";

// Default room settings
const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  allowAllPlayPause: false,
  allowAllSkip: false,
  allowAllDelete: false,
  allowAllQueueReorder: false,
};

const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  user: null,
  messages: [],
  isLoading: false,
  error: null,

  createRoom: async (name: string, userName: string) => {
    set({ isLoading: true, error: null });
    try {
      const roomId = uuidv4().substring(0, 8);
      const userId = uuidv4();

      const timestamp = Date.now();
      const newRoom: Room = {
        id: roomId,
        name,
        createdAt: timestamp,
        hostId: userId,
        currentVideo: null,
        queue: [],
        isPlaying: false,
        currentTime: 0,
        lastUpdated: timestamp,
        users: {
          [userId]: {
            id: userId,
            name: userName,
            isHost: true,
            joinedAt: timestamp,
          },
        },
        settings: DEFAULT_ROOM_SETTINGS,
      };

      await dbSet(ref(database, `rooms/${roomId}`), newRoom);

      // Set up listeners
      const roomStore = get();
      roomStore.setupRoomListeners(roomId, userId);

      // Save session to localStorage
      localStorage.setItem(
        "youtube-jam-session",
        JSON.stringify({
          roomId,
          userId,
          userName,
        })
      );

      set({
        room: newRoom,
        user: { id: userId, name: userName, isHost: true, joinedAt: timestamp },
        isLoading: false,
      });

      return roomId;
    } catch (error) {
      console.error("Error creating room:", error);
      set({
        isLoading: false,
        error: "Failed to create room. Please try again.",
      });
      throw error;
    }
  },

  joinRoom: async (roomId: string, userName: string) => {
    set({ isLoading: true, error: null });
    try {
      const roomRef = ref(database, `rooms/${roomId}`);
      const snapshot = await dbGet(roomRef);

      if (!snapshot.exists()) {
        throw new Error("Room not found");
      }

      const roomData = snapshot.val() as Room;
      const userId = uuidv4();
      const timestamp = Date.now();

      const user: User = {
        id: userId,
        name: userName,
        isHost: false,
        joinedAt: timestamp,
      };

      // Add user to room
      await update(ref(database, `rooms/${roomId}/users/${userId}`), user);

      // Set up listeners
      const roomStore = get();
      roomStore.setupRoomListeners(roomId, userId);

      // Save session to localStorage
      localStorage.setItem(
        "youtube-jam-session",
        JSON.stringify({
          roomId,
          userId,
          userName,
        })
      );

      set({
        room: { ...roomData, users: { ...roomData.users, [userId]: user } },
        user,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error joining room:", error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to join room",
      });
      throw error;
    }
  },

  rejoinRoom: async () => {
    const sessionData = localStorage.getItem("youtube-jam-session");
    if (!sessionData) return false;

    try {
      const { roomId, userId, userName } = JSON.parse(sessionData);
      if (!roomId || !userId || !userName) return false;

      set({ isLoading: true, error: null });

      // Check if room exists
      const roomRef = ref(database, `rooms/${roomId}`);
      const roomSnapshot = await dbGet(roomRef);

      if (!roomSnapshot.exists()) {
        localStorage.removeItem("youtube-jam-session");
        set({ isLoading: false, error: "Room no longer exists" });
        return false;
      }

      const roomData = roomSnapshot.val() as Room;

      // Check if user still exists in the room
      const userRef = ref(database, `rooms/${roomId}/users/${userId}`);
      const userSnapshot = await dbGet(userRef);

      if (!userSnapshot.exists()) {
        // User was removed, create a new session
        const timestamp = Date.now();
        const newUser: User = {
          id: userId,
          name: userName,
          isHost: false,
          joinedAt: timestamp,
        };

        // Add user back to room
        await update(ref(database, `rooms/${roomId}/users/${userId}`), newUser);

        // Set up listeners
        const roomStore = get();
        roomStore.setupRoomListeners(roomId, userId);

        set({
          room: {
            ...roomData,
            users: { ...roomData.users, [userId]: newUser },
          },
          user: newUser,
          isLoading: false,
        });
      } else {
        // User exists, just reconnect
        const userData = userSnapshot.val() as User;

        // Set up listeners
        const roomStore = get();
        roomStore.setupRoomListeners(roomId, userId);

        set({
          room: roomData,
          user: userData,
          isLoading: false,
        });
      }

      return true;
    } catch (error) {
      console.error("Error rejoining room:", error);
      localStorage.removeItem("youtube-jam-session");
      set({ isLoading: false, error: "Failed to rejoin room" });
      return false;
    }
  },

  leaveRoom: async () => {
    const { room, user } = get();
    if (!room || !user) return;

    try {
      // If the current user is the host, transfer host privileges
      if (user.isHost) {
        // Get all other users
        const otherUsers = Object.values(room.users).filter(
          (u) => u.id !== user.id
        );

        if (otherUsers.length > 0) {
          // Sort users by join time to pick the longest-present user
          const oldestUser = otherUsers.sort(
            (a, b) => a.joinedAt - b.joinedAt
          )[0];

          // Update the chosen user to be the new host
          await update(
            ref(database, `rooms/${room.id}/users/${oldestUser.id}`),
            {
              isHost: true,
            }
          );

          console.log(`Host privileges transferred to ${oldestUser.name}`);
        }
        // If no other users, the room will naturally expire when empty
      }

      // Remove the user from the room
      const userRef = ref(database, `rooms/${room.id}/users/${user.id}`);
      await remove(userRef);

      // Clean up listeners
      const roomStore = get();
      roomStore.cleanupRoomListeners();

      // Clear session
      localStorage.removeItem("youtube-jam-session");

      set({ room: null, user: null, messages: [] });
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  },

  addVideo: async (videoId: string, title: string, thumbnail: string) => {
    const { room, user } = get();
    if (!room || !user) return;

    try {
      const timestamp = Date.now();
      const video: VideoInfo = {
        id: videoId,
        title,
        thumbnail,
        addedBy: user.id,
        addedAt: timestamp,
      };

      if (!room.currentVideo) {
        // If no video is playing, set this as current
        await update(ref(database, `rooms/${room.id}`), {
          currentVideo: video,
          lastUpdated: timestamp,
        });
      } else {
        // Otherwise add to queue
        const queueRef = ref(database, `rooms/${room.id}/queue`);
        const newQueue = [...(room.queue || []), video];
        await dbSet(queueRef, newQueue);
      }
    } catch (error) {
      console.error("Error adding video:", error);
    }
  },

  removeVideo: async (videoId: string) => {
    const { room, user } = get();
    if (!room || !user) return;

    const canDelete = get().canUserDelete();
    const isVideoOwner = (video: VideoInfo) => video.addedBy === user.id;

    try {
      if (room.currentVideo && room.currentVideo.id === videoId) {
        // For current video: Check permissions
        if (!canDelete && !isVideoOwner(room.currentVideo)) {
          console.error("You don't have permission to remove this video");
          return;
        }

        // If removing current video, replace with first in queue or null
        const timestamp = Date.now();
        const nextVideo = room.queue.length > 0 ? room.queue[0] : null;
        const newQueue = room.queue.slice(1);

        await update(ref(database, `rooms/${room.id}`), {
          currentVideo: nextVideo,
          queue: newQueue,
          isPlaying: nextVideo ? true : false,
          currentTime: 0,
          lastUpdated: timestamp,
        });
      } else {
        // For queue: Find the video in the queue
        const videoInQueue = room.queue.find((v) => v.id === videoId);

        if (!videoInQueue) return;

        // Check permissions
        if (!canDelete && !isVideoOwner(videoInQueue)) {
          console.error("You don't have permission to remove this video");
          return;
        }

        // Remove from queue
        const newQueue = room.queue.filter((v) => v.id !== videoId);
        await dbSet(ref(database, `rooms/${room.id}/queue`), newQueue);
      }
    } catch (error) {
      console.error("Error removing video:", error);
    }
  },

  playVideo: async () => {
    const { room } = get();
    if (!room || !room.currentVideo) return;

    const canPlay = get().canUserPlayPause();
    if (!canPlay) return;

    try {
      await update(ref(database, `rooms/${room.id}`), {
        isPlaying: true,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error("Error playing video:", error);
    }
  },

  pauseVideo: async () => {
    const { room } = get();
    if (!room || !room.currentVideo) return;

    const canPause = get().canUserPlayPause();
    if (!canPause) return;

    try {
      await update(ref(database, `rooms/${room.id}`), {
        isPlaying: false,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error("Error pausing video:", error);
    }
  },

  seekVideo: async (time: number) => {
    const { room, user } = get();
    if (!room || !room.currentVideo || !user || !user.isHost) return;

    try {
      await update(ref(database, `rooms/${room.id}`), {
        currentTime: time,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error("Error seeking video:", error);
    }
  },

  skipVideo: async () => {
    const { room } = get();
    if (!room) return;

    const canSkip = get().canUserSkip();
    if (!canSkip) return;

    try {
      const timestamp = Date.now();

      if (room.queue.length > 0) {
        const nextVideo = room.queue[0];
        const newQueue = room.queue.slice(1);

        await update(ref(database, `rooms/${room.id}`), {
          currentVideo: nextVideo,
          queue: newQueue,
          isPlaying: true,
          currentTime: 0,
          lastUpdated: timestamp,
        });
      } else {
        // No more videos in queue
        await update(ref(database, `rooms/${room.id}`), {
          currentVideo: null,
          isPlaying: false,
          currentTime: 0,
          lastUpdated: timestamp,
        });
      }
    } catch (error) {
      console.error("Error skipping video:", error);
    }
  },

  skipCurrentVideo: async () => {
    const { room } = get();
    if (!room || !room.currentVideo) return;

    const canDelete = get().canUserDelete();
    if (!canDelete) return;

    try {
      const timestamp = Date.now();

      // Simply remove the current video without automatically playing the next one
      await update(ref(database, `rooms/${room.id}`), {
        currentVideo: null,
        isPlaying: false,
        currentTime: 0,
        lastUpdated: timestamp,
      });
    } catch (error) {
      console.error("Error removing current video:", error);
    }
  },

  playVideoFromQueue: async (videoId: string) => {
    const { room, user } = get();
    if (!room || !user || !user.isHost) return;

    try {
      // Find the video in the queue
      const videoIndex = room.queue.findIndex((video) => video.id === videoId);
      if (videoIndex === -1) return; // Video not found in queue

      const timestamp = Date.now();
      const selectedVideo = room.queue[videoIndex];

      // Remove the selected video from the queue
      const newQueue = [...room.queue];
      newQueue.splice(videoIndex, 1);

      // Update the room with the selected video as current
      await update(ref(database, `rooms/${room.id}`), {
        currentVideo: selectedVideo,
        queue: newQueue,
        isPlaying: true,
        currentTime: 0,
        lastUpdated: timestamp,
      });
    } catch (error) {
      console.error("Error playing video from queue:", error);
    }
  },

  reorderQueue: async (newQueue: VideoInfo[]) => {
    const { room } = get();
    if (!room) return;

    const canReorder = get().canUserReorderQueue();
    if (!canReorder) return;

    try {
      const timestamp = Date.now();

      // Update the queue with the new order
      await dbSet(ref(database, `rooms/${room.id}/queue`), newQueue);

      // Update the lastUpdated timestamp
      await update(ref(database, `rooms/${room.id}`), {
        lastUpdated: timestamp,
      });
    } catch (error) {
      console.error("Error reordering queue:", error);
    }
  },

  removeUser: async (userId: string) => {
    const { room, user } = get();
    if (!room || !user || !user.isHost) return;

    try {
      // Don't allow removing yourself as host
      if (userId === user.id) {
        console.error("Cannot remove yourself as host");
        return;
      }

      // Check if the user exists
      if (!room.users[userId]) {
        console.error("User not found");
        return;
      }

      // Remove user from the room
      await remove(ref(database, `rooms/${room.id}/users/${userId}`));

      console.log(`User ${userId} removed from room ${room.id}`);
    } catch (error) {
      console.error("Error removing user:", error);
    }
  },

  transferHost: async (userId: string) => {
    const { room, user } = get();
    if (!room || !user || !user.isHost) return;

    try {
      // Don't allow transferring to yourself (you're already host)
      if (userId === user.id) {
        console.error("You are already the host");
        return;
      }

      // Check if the target user exists
      if (!room.users[userId]) {
        console.error("User not found");
        return;
      }

      // Start a transaction to update both users
      const updates: Record<string, boolean> = {};

      // Remove host privilege from current host
      updates[`rooms/${room.id}/users/${user.id}/isHost`] = false;

      // Add host privilege to new host
      updates[`rooms/${room.id}/users/${userId}/isHost`] = true;

      // Update the database
      await update(ref(database), updates);

      console.log(`Host privileges transferred to ${room.users[userId].name}`);
    } catch (error) {
      console.error("Error transferring host privileges:", error);
    }
  },

  sendMessage: async (text: string) => {
    const { room, user } = get();
    if (!room || !user || !text.trim()) return;

    try {
      const messageData: Message = {
        id: uuidv4(),
        roomId: room.id,
        userId: user.id,
        userName: user.name,
        text: text.trim(),
        timestamp: Date.now(),
      };

      const messagesRef = ref(database, `messages/${room.id}`);
      await push(messagesRef, messageData);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  },

  // Internal methods (not exposed in the type)
  setupRoomListeners: (roomId: string, userId: string) => {
    // Listen for room changes
    const roomRef = ref(database, `rooms/${roomId}`);
    onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const roomData = snapshot.val() as Room;
        set({ room: roomData });
      } else {
        // Room was deleted
        set({
          room: null,
          user: null,
          messages: [],
          error: "Room no longer exists",
        });
      }
    });

    // Listen for messages
    const messagesRef = ref(database, `messages/${roomId}`);
    onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        const messages = Object.values(messagesData) as Message[];
        set({ messages: messages.sort((a, b) => a.timestamp - b.timestamp) });
      }
    });

    // Set up presence
    const connectedRef = ref(database, ".info/connected");
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        const userStatusRef = ref(database, `rooms/${roomId}/users/${userId}`);

        // First check if user exists in the room - without setting up an ongoing listener
        dbGet(userStatusRef).then((userSnapshot) => {
          if (userSnapshot.exists()) {
            // Only after confirming user exists, set up the listener for removal
            onValue(userStatusRef, (snapshot) => {
              // Only respond to actual removal - not initial connection
              if (!snapshot.exists()) {
                const roomStore = get();
                roomStore.cleanupRoomListeners();
                set({
                  room: null,
                  user: null,
                  messages: [],
                  error: "You were removed from the room",
                });
              }
            });
          }
        });
      }
    });
  },

  cleanupRoomListeners: () => {
    const { room } = get();
    if (!room) return;

    // Remove all listeners
    off(ref(database, `rooms/${room.id}`));
    off(ref(database, `messages/${room.id}`));
    off(ref(database, ".info/connected"));
  },

  // Add room settings functionality
  updateRoomSettings: async (settings: RoomSettings) => {
    const { room, user } = get();
    if (!room || !user || !user.isHost) return;

    try {
      await update(ref(database, `rooms/${room.id}`), {
        settings,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error("Error updating room settings:", error);
    }
  },

  // Permission helper functions
  canUserPlayPause: () => {
    const { room, user } = get();
    if (!room || !user) return false;

    // Host can always control playback
    if (user.isHost) return true;

    // Check room settings
    return !!room.settings?.allowAllPlayPause;
  },

  canUserSkip: () => {
    const { room, user } = get();
    if (!room || !user) return false;

    // Host can always skip
    if (user.isHost) return true;

    // Check room settings
    return !!room.settings?.allowAllSkip;
  },

  canUserDelete: () => {
    const { room, user } = get();
    if (!room || !user) return false;

    // Host can always delete
    if (user.isHost) return true;

    // Check room settings
    return !!room.settings?.allowAllDelete;
  },

  canUserReorderQueue: () => {
    const { room, user } = get();
    if (!room || !user) return false;

    // Host can always reorder
    if (user.isHost) return true;

    // Check room settings
    return !!room.settings?.allowAllQueueReorder;
  },
}));

export default useRoomStore;
