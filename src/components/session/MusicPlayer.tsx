"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { MusicCue } from "@/lib/types/session";

// ---------------------------------------------------------------------------
// YouTube IFrame API types (minimal declarations)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface MusicContextValue {
  currentTrack: MusicCue | null;
  isPlaying: boolean;
  volume: number;
  playTrack: (cue: MusicCue) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  fadeOut: () => void;
  allCues: MusicCue[];
  setAllCues: (cues: MusicCue[]) => void;
  audioUnlocked: boolean;
  apiReady: boolean;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// YouTube IFrame API loader (promise-based, singleton)
// ---------------------------------------------------------------------------

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve, reject) => {
    // Already loaded
    if (typeof window !== "undefined" && window.YT && window.YT.Player) {
      resolve();
      return;
    }

    // Set up the global callback
    window.onYouTubeIframeAPIReady = () => resolve();

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      ytApiPromise = null;
      reject(new Error("Failed to load YouTube IFrame API"));
    };
    document.head.appendChild(script);
  });

  return ytApiPromise;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function MusicProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<MusicCue | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(30);
  const [allCues, setAllCues] = useState<MusicCue[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load the YouTube API on mount
  useEffect(() => {
    loadYouTubeAPI()
      .then(() => setApiReady(true))
      .catch((err) => console.warn("YouTube API load failed:", err));
  }, []);

  // Create the hidden player once the API is ready
  useEffect(() => {
    if (!apiReady || playerRef.current) return;

    playerRef.current = new window.YT.Player("yt-music-player", {
      height: "0",
      width: "0",
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        // audio-only: keep the iframe invisible
        origin: typeof window !== "undefined" ? window.location.origin : "",
      },
      events: {
        onReady: () => {
          // Player is ready
          if (playerRef.current) {
            playerRef.current.setVolume(volume);
          }
        },
        onStateChange: (event: any) => {
          const YT = window.YT;
          if (event.data === YT.PlayerState.ENDED) {
            // If looping, replay
            if (currentTrackRef.current?.loop) {
              playerRef.current?.seekTo(0);
              playerRef.current?.playVideo();
            } else {
              setIsPlaying(false);
            }
          }
          if (event.data === YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            setAudioUnlocked(true);
          }
          if (event.data === YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          }
        },
      },
    });
  }, [apiReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a ref to the current track so the onStateChange callback can access it
  const currentTrackRef = useRef<MusicCue | null>(null);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // ---------------------------------------------------------------------------
  // Playback controls
  // ---------------------------------------------------------------------------

  const playTrack = useCallback(
    (cue: MusicCue) => {
      if (!playerRef.current || !apiReady) return;
      // Clear any fade in progress
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }

      const videoId =
        cue.videoIds[Math.floor(Math.random() * cue.videoIds.length)];
      setCurrentTrack(cue);
      const vol = cue.volume ?? 30;
      setVolumeState(vol);
      playerRef.current.setVolume(vol);
      playerRef.current.loadVideoById(videoId);
    },
    [apiReady]
  );

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const resume = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const stop = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    playerRef.current?.stopVideo();
    setCurrentTrack(null);
    setIsPlaying(false);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setVolumeState(clamped);
    playerRef.current?.setVolume(clamped);
  }, []);

  const fadeOut = useCallback(() => {
    if (!playerRef.current) return;
    const startVol = playerRef.current.getVolume?.() ?? volume;
    const steps = 10;
    const stepTime = 500 / steps; // 500ms total
    let currentStep = 0;

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const newVol = Math.round(startVol * (1 - currentStep / steps));
      playerRef.current?.setVolume(Math.max(0, newVol));

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
        playerRef.current?.pauseVideo();
        // Restore volume for next play
        playerRef.current?.setVolume(startVol);
        setIsPlaying(false);
      }
    }, stepTime);
  }, [volume]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      playerRef.current?.destroy?.();
    };
  }, []);

  // Unlock audio on first user tap (mobile autoplay policy)
  useEffect(() => {
    if (audioUnlocked) return;
    function handleFirstInteraction() {
      setAudioUnlocked(true);
      document.removeEventListener("touchstart", handleFirstInteraction);
      document.removeEventListener("click", handleFirstInteraction);
    }
    document.addEventListener("touchstart", handleFirstInteraction, {
      once: true,
    });
    document.addEventListener("click", handleFirstInteraction, { once: true });
    return () => {
      document.removeEventListener("touchstart", handleFirstInteraction);
      document.removeEventListener("click", handleFirstInteraction);
    };
  }, [audioUnlocked]);

  return (
    <MusicContext.Provider
      value={{
        currentTrack,
        isPlaying,
        volume,
        playTrack,
        pause,
        resume,
        stop,
        setVolume,
        fadeOut,
        allCues,
        setAllCues,
        audioUnlocked,
        apiReady,
      }}
    >
      {children}
      {/* Hidden YouTube player container */}
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          width: 0,
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <div id="yt-music-player" />
      </div>
    </MusicContext.Provider>
  );
}
