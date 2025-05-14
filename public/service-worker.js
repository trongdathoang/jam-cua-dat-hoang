// Background audio service worker
// This service worker enables background audio playback on mobile devices

const CACHE_NAME = "youtube-jam-cache-v1";
const AUDIO_CHANNEL = new BroadcastChannel("audio-channel");

// YouTube iFrame API URL for loading in the service worker
const YOUTUBE_API_URL = "https://www.youtube.com/iframe_api";

let currentYoutubeId = null;
let isPlaying = false;
let player = null;
let apiLoaded = false;
let hasInitialized = false;

// Files to cache for offline functionality
const filesToCache = ["/", "/index.html", "/src/main.tsx"];

// Install event - cache important files
self.addEventListener("install", (event) => {
  console.log("Service Worker installing");

  // Skip waiting to activate immediately
  self.skipWaiting();

  // Cache static assets
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(filesToCache);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activated");

  // Take control of all clients
  event.waitUntil(self.clients.claim());

  // Don't initialize state until explicitly requested
  hasInitialized = false;

  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Load YouTube IFrame API
const loadYouTubeAPI = () => {
  if (apiLoaded) return Promise.resolve();

  return new Promise((resolve, reject) => {
    // Create a script element to load the YouTube IFrame API
    const script = document.createElement("script");
    script.src = YOUTUBE_API_URL;
    script.onload = () => {
      console.log("YouTube IFrame API loaded in service worker");
      apiLoaded = true;
      resolve();
    };
    script.onerror = (error) => {
      console.error("Failed to load YouTube IFrame API:", error);
      reject(error);
    };
    document.head.appendChild(script);
  });
};

// Initialize YouTube player
const initializePlayer = (videoId) => {
  if (player) {
    return Promise.resolve(player);
  }

  return new Promise((resolve, reject) => {
    // Create a player container
    const playerContainer = document.createElement("div");
    playerContainer.id = "youtube-player-container";
    playerContainer.style.position = "absolute";
    playerContainer.style.top = "-9999px";
    playerContainer.style.left = "-9999px";
    document.body.appendChild(playerContainer);

    // Initialize the player
    player = new YT.Player(playerContainer.id, {
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onReady: () => {
          console.log("YouTube player ready in service worker");
          resolve(player);
        },
        onError: (event) => {
          console.error("YouTube player error:", event.data);
          reject(event.data);
        },
        onStateChange: (event) => {
          // YouTube states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
          if (event.data === YT.PlayerState.ENDED) {
            // Video ended, notify clients to play next video
            AUDIO_CHANNEL.postMessage({
              type: "AUDIO_COMMAND",
              command: "skip",
            });
          } else if (event.data === YT.PlayerState.PLAYING) {
            isPlaying = true;
            broadcastStatus();
          } else if (event.data === YT.PlayerState.PAUSED) {
            isPlaying = false;
            broadcastStatus();
          }
        },
      },
    });
  });
};

// Play a YouTube video
const playYouTubeVideo = async (videoId) => {
  try {
    currentYoutubeId = videoId;

    if (!player) {
      await loadYouTubeAPI();
      await initializePlayer(videoId);
    } else {
      // If we already have a player, load the new video
      player.loadVideoById(videoId);
    }

    // Start playing
    player.playVideo();
    isPlaying = true;

    // Broadcast status to all clients
    broadcastStatus();

    return true;
  } catch (error) {
    console.error("Error playing YouTube video:", error);
    return false;
  }
};

// Pause the currently playing video
const pauseYouTubeVideo = () => {
  if (player && currentYoutubeId) {
    player.pauseVideo();
    isPlaying = false;
    broadcastStatus();
    return true;
  }
  return false;
};

// Broadcast current status to all clients
const broadcastStatus = () => {
  AUDIO_CHANNEL.postMessage({
    type: "AUDIO_STATUS",
    isPlaying,
    videoId: currentYoutubeId,
  });
};

// Listen for messages from the main application
self.addEventListener("message", async (event) => {
  const data = event.data;

  if (data.type === "INIT_AUDIO") {
    console.log("Initializing audio in service worker");
    hasInitialized = true;

    // Respond to the client with empty state
    if (event.source) {
      event.source.postMessage({
        type: "AUDIO_STATUS",
        isPlaying: false,
        videoId: null,
      });
    }
  } else if (data.type === "PLAY_AUDIO") {
    console.log("Service worker received play command", data);

    // Update state
    currentYoutubeId = data.videoId;
    isPlaying = true;
    hasInitialized = true;

    // Broadcast status to all clients
    broadcastStatus();

    // Respond to the client that sent the message
    if (event.source) {
      event.source.postMessage({
        type: "AUDIO_STATUS",
        isPlaying: true,
        videoId: data.videoId,
      });
    }
  } else if (data.type === "PAUSE_AUDIO") {
    console.log("Service worker received pause command");

    // Update state
    isPlaying = false;

    // Broadcast status to all clients
    broadcastStatus();

    // Respond to the client
    if (event.source) {
      event.source.postMessage({
        type: "AUDIO_STATUS",
        isPlaying: false,
        videoId: currentYoutubeId,
      });
    }
  } else if (data.type === "GET_STATUS") {
    // Only respond with status if we've been initialized
    if (!hasInitialized) {
      console.log(
        "Service worker responding with empty status (not initialized)"
      );
      if (event.source) {
        event.source.postMessage({
          type: "AUDIO_STATUS",
          isPlaying: false,
          videoId: null,
        });
      }
      return;
    }

    console.log("Service worker responding with current status", {
      isPlaying,
      videoId: currentYoutubeId,
    });
    // Respond with current status
    if (event.source) {
      event.source.postMessage({
        type: "AUDIO_STATUS",
        isPlaying,
        videoId: currentYoutubeId,
      });
    }
  } else if (data.type === "VIDEO_ENDED") {
    // Video ended in the main app, notify all clients to play next video
    isPlaying = false;
    AUDIO_CHANNEL.postMessage({
      type: "AUDIO_COMMAND",
      command: "skip",
    });
  }
});

// Service Worker fetch event - we'll use this to potentially cache audio resources
self.addEventListener("fetch", (event) => {
  // Cache strategy for important assets
  if (
    event.request.url.includes("/src/") ||
    event.request.url.includes("/assets/") ||
    event.request.url.endsWith(".html")
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((response) => {
          // Cache the fetched response
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
  }
});

// Handle push notifications
self.addEventListener("push", (event) => {
  const data = event.data.json();

  // Show a notification when we receive a push message
  event.waitUntil(
    self.registration.showNotification("YouTube Jam", {
      body: data.message || "Music is playing in the background",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      actions: [
        { action: "pause", title: "Pause" },
        { action: "skip", title: "Skip" },
      ],
    })
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "pause") {
    // Broadcast pause command
    AUDIO_CHANNEL.postMessage({
      type: "AUDIO_COMMAND",
      command: "pause",
    });
  } else if (event.action === "skip") {
    // Broadcast skip command
    AUDIO_CHANNEL.postMessage({
      type: "AUDIO_COMMAND",
      command: "skip",
    });
  } else {
    // Open or focus the app when the notification is clicked
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow("/");
      })
    );
  }
});

console.log("YouTube Jam Service Worker Loaded");
