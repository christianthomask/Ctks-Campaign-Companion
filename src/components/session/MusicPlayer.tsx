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
// Global type declarations
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    SC: any;
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
// API Loaders (singleton, promise-based)
// ---------------------------------------------------------------------------

let ytApiPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve, reject) => {
    if (typeof window !== "undefined" && window.YT?.Player) {
      resolve();
      return;
    }
    window.onYouTubeIframeAPIReady = () => resolve();
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => { ytApiPromise = null; reject(new Error("YT API failed")); };
    document.head.appendChild(script);
  });
  return ytApiPromise;
}

let scApiPromise: Promise<void> | null = null;
function loadSoundCloudAPI(): Promise<void> {
  if (scApiPromise) return scApiPromise;
  scApiPromise = new Promise<void>((resolve, reject) => {
    if (typeof window !== "undefined" && window.SC?.Widget) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    script.onload = () => {
      // SC.Widget may take a moment after script load
      const check = () => {
        if (window.SC?.Widget) resolve();
        else setTimeout(check, 50);
      };
      check();
    };
    script.onerror = () => { scApiPromise = null; reject(new Error("SC API failed")); };
    document.head.appendChild(script);
  });
  return scApiPromise;
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

  const ytPlayerRef = useRef<any>(null);
  const scWidgetRef = useRef<any>(null);
  const activeSourceRef = useRef<"soundcloud" | "youtube" | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTrackRef = useRef<MusicCue | null>(null);

  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  // Load both APIs on mount
  useEffect(() => {
    Promise.allSettled([loadYouTubeAPI(), loadSoundCloudAPI()]).then(() => {
      setApiReady(true);
    });
  }, []);

  // Create hidden YouTube player
  useEffect(() => {
    if (!apiReady || ytPlayerRef.current) return;
    if (!window.YT?.Player) return;

    ytPlayerRef.current = new window.YT.Player("yt-music-player", {
      height: "0",
      width: "0",
      playerVars: {
        autoplay: 0, controls: 0, disablekb: 1, fs: 0,
        modestbranding: 1, rel: 0,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      },
      events: {
        onStateChange: (event: any) => {
          if (activeSourceRef.current !== "youtube") return;
          if (event.data === window.YT.PlayerState.ENDED) {
            if (currentTrackRef.current?.loop) {
              ytPlayerRef.current?.seekTo(0);
              ytPlayerRef.current?.playVideo();
            } else {
              setIsPlaying(false);
            }
          }
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            setAudioUnlocked(true);
          }
          if (event.data === window.YT.PlayerState.PAUSED) {
            if (activeSourceRef.current === "youtube") setIsPlaying(false);
          }
        },
      },
    });
  }, [apiReady]);

  // Initialize SoundCloud widget
  useEffect(() => {
    if (!apiReady || scWidgetRef.current) return;
    if (!window.SC?.Widget) return;

    const iframe = document.getElementById("sc-widget") as HTMLIFrameElement;
    if (!iframe) return;

    scWidgetRef.current = window.SC.Widget(iframe);
  }, [apiReady]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function stopActivePlayer() {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    if (activeSourceRef.current === "youtube" && ytPlayerRef.current) {
      ytPlayerRef.current.stopVideo();
    }
    if (activeSourceRef.current === "soundcloud" && scWidgetRef.current) {
      scWidgetRef.current.pause();
      scWidgetRef.current.seekTo(0);
    }
  }

  function fadeOutActive(duration: number, callback?: () => void) {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    const steps = 10;
    const stepTime = duration / steps;
    let step = 0;

    if (activeSourceRef.current === "youtube" && ytPlayerRef.current) {
      const startVol = ytPlayerRef.current.getVolume?.() ?? volume;
      fadeIntervalRef.current = setInterval(() => {
        step++;
        ytPlayerRef.current?.setVolume(Math.max(0, Math.round(startVol * (1 - step / steps))));
        if (step >= steps) {
          clearInterval(fadeIntervalRef.current!);
          fadeIntervalRef.current = null;
          ytPlayerRef.current?.pauseVideo();
          ytPlayerRef.current?.setVolume(startVol);
          callback?.();
        }
      }, stepTime);
    } else if (activeSourceRef.current === "soundcloud" && scWidgetRef.current) {
      scWidgetRef.current.getVolume((startVol: number) => {
        fadeIntervalRef.current = setInterval(() => {
          step++;
          scWidgetRef.current.setVolume(Math.max(0, Math.round(startVol * (1 - step / steps))));
          if (step >= steps) {
            clearInterval(fadeIntervalRef.current!);
            fadeIntervalRef.current = null;
            scWidgetRef.current.pause();
            scWidgetRef.current.seekTo(0);
            callback?.();
          }
        }, stepTime);
      });
    } else {
      callback?.();
    }
  }

  // ---------------------------------------------------------------------------
  // Playback controls
  // ---------------------------------------------------------------------------

  const playTrack = useCallback((cue: MusicCue) => {
    if (!apiReady) return;
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    const startNewTrack = () => {
      const vol = cue.volume ?? 30;
      setCurrentTrack(cue);
      setVolumeState(vol);

      if (cue.source === "soundcloud" && cue.urls.length > 0) {
        // Ensure widget is initialized
        if (!scWidgetRef.current && window.SC?.Widget) {
          const iframe = document.getElementById("sc-widget") as HTMLIFrameElement;
          if (iframe) scWidgetRef.current = window.SC.Widget(iframe);
        }
        if (!scWidgetRef.current) return;
        // Stop YouTube if it was playing
        if (activeSourceRef.current === "youtube") {
          ytPlayerRef.current?.stopVideo();
        }
        activeSourceRef.current = "soundcloud";

        const url = cue.urls[Math.floor(Math.random() * cue.urls.length)];

        // Unbind previous finish handlers
        try { scWidgetRef.current.unbind(window.SC.Widget.Events.FINISH); } catch {}

        scWidgetRef.current.load(url, {
          auto_play: true,
          show_artwork: false,
          show_comments: false,
          show_playcount: false,
          show_user: false,
          buying: false,
          sharing: false,
          download: false,
          callback: () => {
            scWidgetRef.current.setVolume(vol);
            setIsPlaying(true);
            setAudioUnlocked(true);

            if (cue.loop) {
              scWidgetRef.current.bind(window.SC.Widget.Events.FINISH, () => {
                scWidgetRef.current.seekTo(0);
                scWidgetRef.current.play();
              });
            }
          },
        });
      } else if (cue.videoIds.length > 0 && ytPlayerRef.current) {
        // Stop SoundCloud if it was playing
        if (activeSourceRef.current === "soundcloud") {
          scWidgetRef.current?.pause();
        }
        activeSourceRef.current = "youtube";

        const videoId = cue.videoIds[Math.floor(Math.random() * cue.videoIds.length)];
        ytPlayerRef.current.setVolume(vol);
        ytPlayerRef.current.loadVideoById(videoId);
      }
    };

    // Fade out current track before starting new one
    if (isPlaying && activeSourceRef.current) {
      fadeOutActive(400, startNewTrack);
    } else {
      stopActivePlayer();
      startNewTrack();
    }
  }, [apiReady, isPlaying]);

  const pause = useCallback(() => {
    if (activeSourceRef.current === "youtube") ytPlayerRef.current?.pauseVideo();
    if (activeSourceRef.current === "soundcloud") scWidgetRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (activeSourceRef.current === "youtube") ytPlayerRef.current?.playVideo();
    if (activeSourceRef.current === "soundcloud") scWidgetRef.current?.play();
    setIsPlaying(true);
  }, []);

  const stop = useCallback(() => {
    stopActivePlayer();
    setCurrentTrack(null);
    setIsPlaying(false);
    activeSourceRef.current = null;
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setVolumeState(clamped);
    if (activeSourceRef.current === "youtube") ytPlayerRef.current?.setVolume(clamped);
    if (activeSourceRef.current === "soundcloud") scWidgetRef.current?.setVolume(clamped);
  }, []);

  const fadeOut = useCallback(() => {
    fadeOutActive(500, () => {
      setIsPlaying(false);
    });
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      ytPlayerRef.current?.destroy?.();
    };
  }, []);

  // Unlock audio on first user interaction (mobile autoplay)
  useEffect(() => {
    if (audioUnlocked) return;
    const unlock = () => {
      setAudioUnlocked(true);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("click", unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
  }, [audioUnlocked]);

  return (
    <MusicContext.Provider
      value={{
        currentTrack, isPlaying, volume, playTrack, pause, resume,
        stop, setVolume, fadeOut, allCues, setAllCues, audioUnlocked, apiReady,
      }}
    >
      {children}
      {/* Hidden YouTube player */}
      <div
        style={{ position: "fixed", top: -9999, left: -9999, width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
        aria-hidden="true"
      >
        <div id="yt-music-player" />
      </div>
      {/* Hidden SoundCloud widget */}
      <iframe
        id="sc-widget"
        src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F0&auto_play=false"
        width="0"
        height="0"
        allow="autoplay; encrypted-media"
        style={{ display: "none" }}
      />
    </MusicContext.Provider>
  );
}
