// Background audio service worker
// This service worker enables background audio playback on mobile devices

const CACHE_NAME = "youtube-jam-cache-v1";
const AUDIO_CHANNEL = new BroadcastChannel("audio-channel");

let audioContext = null;
let audioSource = null;
let currentYoutubeId = null;
let isPlaying = false;

// Initialize AudioContext when service worker activates
self.addEventListener("activate", (event) => {
  console.log("Service Worker activated");
  self.clients.claim();
});

// Listen for messages from the main application
self.addEventListener("message", async (event) => {
  const data = event.data;

  if (data.type === "INIT_AUDIO") {
    console.log("Initializing audio in service worker");
    // We'll initialize audio once we receive a play command
  } else if (data.type === "PLAY_AUDIO") {
    console.log("Service worker received play command", data);
    currentYoutubeId = data.videoId;
    isPlaying = true;

    // Respond to the client that sent the message
    if (event.source) {
      event.source.postMessage({
        type: "AUDIO_STATUS",
        isPlaying: true,
        videoId: currentYoutubeId,
      });
    }

    // Broadcast status to all clients
    AUDIO_CHANNEL.postMessage({
      type: "AUDIO_STATUS",
      isPlaying: true,
      videoId: currentYoutubeId,
    });
  } else if (data.type === "PAUSE_AUDIO") {
    console.log("Service worker received pause command");
    isPlaying = false;

    // Broadcast status to all clients
    AUDIO_CHANNEL.postMessage({
      type: "AUDIO_STATUS",
      isPlaying: false,
      videoId: currentYoutubeId,
    });
  } else if (data.type === "GET_STATUS") {
    // Respond with current status
    if (event.source) {
      event.source.postMessage({
        type: "AUDIO_STATUS",
        isPlaying,
        videoId: currentYoutubeId,
      });
    }
  }
});

// Service Worker fetch event - we'll use this to potentially cache audio resources
self.addEventListener("fetch", (event) => {
  // We're not doing anything special with fetch yet, but we could
  // intercept YouTube API requests or audio files here
});

// Handle push notifications (for possible future use)
self.addEventListener("push", (event) => {
  const data = event.data.json();

  if (data.type === "AUDIO_COMMAND") {
    // Handle remote audio commands
  }

  // Show a notification when we receive a push message
  self.registration.showNotification("YouTube Jam", {
    body: data.message || "Music is playing in the background",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    actions: [
      { action: "pause", title: "Pause" },
      { action: "skip", title: "Skip" },
    ],
  });
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
