/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "virtual:pwa-register" {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (
      registration: ServiceWorkerRegistration | undefined
    ) => void;
    onRegisterError?: (error: Error) => void;
  }

  export function registerSW(
    options?: RegisterSWOptions
  ): (reloadPage?: boolean) => Promise<void>;
}

// WakeLock API
interface WakeLockSentinel extends EventTarget {
  released: boolean;
  type: string;
  release(): Promise<void>;
  addEventListener(
    type: "release",
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: "release",
    callback: EventListenerOrEventListenerObject,
    options?: EventListenerOptions | boolean
  ): void;
}

interface WakeLock {
  request(type: "screen"): Promise<WakeLockSentinel>;
}

// Extended Navigator interface
interface Navigator {
  wakeLock?: WakeLock;
  mediaSession?: MediaSession;
}

// Extended MediaSession API
interface MediaSession {
  metadata: MediaMetadata | null;
  playbackState: "none" | "paused" | "playing";

  setActionHandler(
    type:
      | "play"
      | "pause"
      | "seekbackward"
      | "seekforward"
      | "seekto"
      | "previoustrack"
      | "nexttrack"
      | "stop",
    callback: MediaSessionActionHandler | null
  ): void;

  setPositionState(state?: {
    duration?: number;
    playbackRate?: number;
    position?: number;
  }): void;
}

type MediaSessionActionHandler = (details: MediaSessionActionDetails) => void;

interface MediaSessionActionDetails {
  action: string;
  seekTime?: number;
  fastSeek?: boolean;
  seekOffset?: number;
}

// MediaMetadata interface
interface MediaMetadataInit {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: MediaImage[];
}

declare class MediaMetadata {
  constructor(init?: MediaMetadataInit);
  title: string;
  artist: string;
  album: string;
  artwork: ReadonlyArray<MediaImage>;
}

interface MediaImage {
  src: string;
  sizes?: string;
  type?: string;
}
