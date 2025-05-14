// Service Worker utility for background audio playback
// This handles the registration and communication with the service worker

// Create a dedicated broadcast channel for audio communication
const AUDIO_CHANNEL = new BroadcastChannel("audio-channel");

/**
 * Register the service worker for background audio playback
 */
export const registerServiceWorker =
  async (): Promise<ServiceWorkerRegistration | null> => {
    if ("serviceWorker" in navigator) {
      try {
        // Force update the service worker
        const registration = await navigator.serviceWorker.register(
          "/service-worker.js",
          { updateViaCache: "none", scope: "/" }
        );
        console.log("Service worker registered:", registration);

        // Send initialization command once the service worker is activated
        if (registration.active) {
          await sendInitCommand(registration.active);
        } else if (registration.installing) {
          await waitForServiceWorkerActive(registration);
        } else {
          throw new Error("No active or installing service worker found");
        }

        return registration;
      } catch (error) {
        console.error("Service worker registration failed:", error);
        // If registration fails, ensure we unregister any existing service workers
        try {
          const registrations =
            await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.unregister();
          }
        } catch (cleanupError) {
          console.error("Failed to clean up service workers:", cleanupError);
        }

        localStorage.setItem("sw-failed", "true");
        return null;
      }
    } else {
      console.warn("Service workers are not supported in this browser");
      return null;
    }
  };

/**
 * Wait for a service worker to become active
 */
const waitForServiceWorkerActive = async (
  registration: ServiceWorkerRegistration
): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Set a timeout to avoid hanging
    const timeout = setTimeout(() => {
      reject(new Error("Service worker activation timed out"));
    }, 5000);

    if (!registration.installing) {
      clearTimeout(timeout);
      reject(new Error("No installing service worker found"));
      return;
    }

    const onStateChange = () => {
      if (!registration.installing) return;

      if (registration.installing.state === "activated") {
        clearTimeout(timeout);
        registration.installing.removeEventListener(
          "statechange",
          onStateChange
        );

        // Send init command to the now-active service worker
        if (registration.active) {
          sendInitCommand(registration.active).then(resolve).catch(reject);
        } else {
          reject(
            new Error("Service worker activated but no active reference found")
          );
        }
      } else if (registration.installing.state === "redundant") {
        clearTimeout(timeout);
        registration.installing.removeEventListener(
          "statechange",
          onStateChange
        );
        reject(
          new Error("Service worker installation failed (became redundant)")
        );
      }
    };

    registration.installing.addEventListener("statechange", onStateChange);

    // Check immediately in case it's already activated
    if (registration.active && registration.installing.state === "activated") {
      clearTimeout(timeout);
      registration.installing.removeEventListener("statechange", onStateChange);
      sendInitCommand(registration.active).then(resolve).catch(reject);
    }
  });
};

/**
 * Send initialization command to the service worker
 */
const sendInitCommand = async (activeWorker: ServiceWorker): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Set a timeout to avoid hanging
    const timeout = setTimeout(() => {
      reject(new Error("Service worker initialization timed out"));
    }, 3000);

    // Create a one-time message handler for initialization response
    const messageHandler = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === "AUDIO_STATUS") {
        clearTimeout(timeout);
        navigator.serviceWorker.removeEventListener("message", messageHandler);
        resolve();
      }
    };

    navigator.serviceWorker.addEventListener("message", messageHandler);

    try {
      // Send the initialization message
      activeWorker.postMessage({
        type: "INIT_AUDIO",
      });

      console.log("Sent initialization command to service worker");
    } catch (error) {
      clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener("message", messageHandler);
      reject(error);
    }
  });
};

/**
 * Safely send message to service worker, with error handling
 */
const safelySendMessage = (message: Record<string, unknown>): boolean => {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
    console.warn("No active service worker to send message to");
    return false;
  }

  try {
    navigator.serviceWorker.controller.postMessage(message);
    return true;
  } catch (error) {
    console.error("Failed to send message to service worker:", error);
    return false;
  }
};

/**
 * Play audio in the background via service worker
 */
export const playBackgroundAudio = (videoId: string): boolean => {
  return safelySendMessage({
    type: "PLAY_AUDIO",
    videoId,
  });
};

/**
 * Pause audio in the background via service worker
 */
export const pauseBackgroundAudio = (): boolean => {
  return safelySendMessage({
    type: "PAUSE_AUDIO",
  });
};

/**
 * Skip to the next video via service worker
 */
export const skipBackgroundAudio = (): boolean => {
  try {
    // This function will trigger a command via the broadcast channel
    // that the main app listens to and handles with the appropriate business logic
    AUDIO_CHANNEL.postMessage({
      type: "AUDIO_COMMAND",
      command: "skip",
    });
    return true;
  } catch (error) {
    console.error("Failed to send skip command via broadcast channel:", error);
    return false;
  }
};

/**
 * Set up event listeners for communication with the service worker
 * @param callbacks Object containing callbacks for various audio events
 */
export const setupServiceWorkerListeners = (callbacks: {
  onPlay?: (videoId: string) => void;
  onPause?: () => void;
  onSkip?: () => void;
  onError?: (error: string) => void;
}): (() => void) => {
  // Listen for messages from the service worker
  const messageHandler = (event: MessageEvent) => {
    const data = event.data;

    if (data.type === "AUDIO_STATUS") {
      if (data.isPlaying && callbacks.onPlay && data.videoId) {
        callbacks.onPlay(data.videoId);
      } else if (!data.isPlaying && callbacks.onPause) {
        callbacks.onPause();
      }
    } else if (data.type === "AUDIO_ERROR" && callbacks.onError) {
      callbacks.onError(data.message);
    }
  };

  // Add message listener
  navigator.serviceWorker.addEventListener("message", messageHandler);

  // Listen for broadcast messages
  AUDIO_CHANNEL.onmessage = (event) => {
    try {
      const data = event.data;

      if (data.type === "AUDIO_COMMAND") {
        if (data.command === "skip" && callbacks.onSkip) {
          callbacks.onSkip();
        } else if (data.command === "pause" && callbacks.onPause) {
          callbacks.onPause();
        }
      }
    } catch (error) {
      console.error("Error processing broadcast message:", error);
      if (callbacks.onError) {
        callbacks.onError("Error processing message: " + String(error));
      }
    }
  };

  return () => {
    // Clean up listeners
    navigator.serviceWorker.removeEventListener("message", messageHandler);
    AUDIO_CHANNEL.close();
  };
};
