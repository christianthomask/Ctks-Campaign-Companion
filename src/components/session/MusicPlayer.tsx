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
  if (!ctx) throw new Error("useMusic must be used within a MusicProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// API Loaders
// ---------------------------------------------------------------------------

let ytApiPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve, reject) => {
    if (typeof window !== "undefined" && window.YT?.Player) { resolve(); return; }
    window.onYouTubeIframeAPIReady = () => resolve();
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => { ytApiPromise = null; reject(new Error("YT API failed")); };
    document.head.appendChild(s);
  });
  return ytApiPromise;
}

let scApiPromise: Promise<void> | null = null;
function loadSoundCloudAPI(): Promise<void> {
  if (scApiPromise) return scApiPromise;
  scApiPromise = new Promise<void>((resolve, reject) => {
    if (typeof window !== "undefined" && window.SC?.Widget) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://w.soundcloud.com/player/api.js";
    s.async = true;
    s.onload = () => {
      const check = () => { if (window.SC?.Widget) resolve(); else setTimeout(check, 50); };
      check();
    };
    s.onerror = () => { scApiPromise = null; reject(new Error("SC API failed")); };
    document.head.appendChild(s);
  });
  return scApiPromise;
}

// ---------------------------------------------------------------------------
// SC Widget Pool — multiple iframes for preloading + crossfade
// ---------------------------------------------------------------------------

const SC_POOL_SIZE = 4;

interface SCSlot {
  widget: any;
  loadedUrl: string | null;
  iframeId: string;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function MusicProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<MusicCue | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(100);
  const [allCues, setAllCues] = useState<MusicCue[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  const ytPlayerRef = useRef<any>(null);
  const scPoolRef = useRef<SCSlot[]>([]);
  const activeSlotRef = useRef<number>(-1);
  const activeSourceRef = useRef<"soundcloud" | "youtube" | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTrackRef = useRef<MusicCue | null>(null);
  const allCuesRef = useRef<MusicCue[]>([]);

  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { allCuesRef.current = allCues; }, [allCues]);

  // Load APIs
  useEffect(() => {
    Promise.allSettled([loadYouTubeAPI(), loadSoundCloudAPI()]).then(() => setApiReady(true));
  }, []);

  // Create YouTube player
  useEffect(() => {
    if (!apiReady || ytPlayerRef.current || !window.YT?.Player) return;
    ytPlayerRef.current = new window.YT.Player("yt-music-player", {
      height: "0", width: "0",
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0 },
      events: {
        onStateChange: (e: any) => {
          if (activeSourceRef.current !== "youtube") return;
          if (e.data === window.YT.PlayerState.ENDED && currentTrackRef.current?.loop) {
            ytPlayerRef.current?.seekTo(0);
            ytPlayerRef.current?.playVideo();
          }
          if (e.data === window.YT.PlayerState.PLAYING) { setIsPlaying(true); setAudioUnlocked(true); }
          if (e.data === window.YT.PlayerState.PAUSED && activeSourceRef.current === "youtube") setIsPlaying(false);
        },
      },
    });
  }, [apiReady]);

  // Initialize SC widget pool
  useEffect(() => {
    if (!apiReady || scPoolRef.current.length > 0 || !window.SC?.Widget) return;
    const pool: SCSlot[] = [];
    for (let i = 0; i < SC_POOL_SIZE; i++) {
      const iframe = document.getElementById(`sc-widget-${i}`) as HTMLIFrameElement;
      if (iframe) {
        pool.push({ widget: window.SC.Widget(iframe), loadedUrl: null, iframeId: `sc-widget-${i}` });
      }
    }
    scPoolRef.current = pool;
  }, [apiReady]);

  // Preload first two cues when allCues changes
  useEffect(() => {
    if (!apiReady || allCues.length === 0 || scPoolRef.current.length === 0) return;
    const scCues = allCues.filter(c => c.source === "soundcloud" && c.urls.length > 0);
    // Preload first two SC tracks into pool slots
    for (let i = 0; i < Math.min(2, scCues.length); i++) {
      preloadIntoSlot(i, scCues[i].urls[0]);
    }
  }, [apiReady, allCues]);

  // ---------------------------------------------------------------------------
  // Pool helpers
  // ---------------------------------------------------------------------------

  function preloadIntoSlot(slotIndex: number, url: string) {
    const pool = scPoolRef.current;
    if (slotIndex >= pool.length || !pool[slotIndex]) return;
    const slot = pool[slotIndex];
    if (slot.loadedUrl === url) return; // already loaded

    slot.widget.load(url, {
      auto_play: false,
      show_artwork: false, show_comments: false, show_playcount: false,
      show_user: false, buying: false, sharing: false, download: false,
      callback: () => { slot.loadedUrl = url; },
    });
  }

  function findSlotWithUrl(url: string): number {
    return scPoolRef.current.findIndex(s => s.loadedUrl === url);
  }

  function findFreeSlot(excludeIndex: number): number {
    // Find a slot that isn't the active one
    for (let i = 0; i < scPoolRef.current.length; i++) {
      if (i !== excludeIndex && i !== activeSlotRef.current) return i;
    }
    // Fallback: use any non-active slot
    return activeSlotRef.current === 0 ? 1 : 0;
  }

  function preloadNeighbors(cue: MusicCue) {
    const cues = allCuesRef.current;
    const scCues = cues.filter(c => c.source === "soundcloud" && c.urls.length > 0);
    const idx = scCues.findIndex(c => c.label === cue.label);
    if (idx === -1) return;

    const toPreload: string[] = [];
    if (idx > 0) toPreload.push(scCues[idx - 1].urls[0]);
    if (idx < scCues.length - 1) toPreload.push(scCues[idx + 1].urls[0]);

    let slotIdx = 0;
    for (const url of toPreload) {
      if (findSlotWithUrl(url) !== -1) continue; // already loaded
      const freeSlot = findFreeSlot(slotIdx);
      if (freeSlot !== -1 && freeSlot !== activeSlotRef.current) {
        preloadIntoSlot(freeSlot, url);
        slotIdx = freeSlot;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Fade helper (for a specific widget)
  // ---------------------------------------------------------------------------

  function fadeWidget(widget: any, duration: number, callback?: () => void) {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    widget.getVolume((startVol: number) => {
      const steps = 10;
      const stepTime = duration / steps;
      let step = 0;
      fadeIntervalRef.current = setInterval(() => {
        step++;
        widget.setVolume(Math.max(0, Math.round(startVol * (1 - step / steps))));
        if (step >= steps) {
          clearInterval(fadeIntervalRef.current!);
          fadeIntervalRef.current = null;
          widget.pause();
          widget.setVolume(startVol); // restore for next play
          callback?.();
        }
      }, stepTime);
    });
  }

  // ---------------------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------------------

  const playTrack = useCallback((cue: MusicCue) => {
    if (!apiReady) return;
    if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }

    const vol = cue.volume ?? 100;
    setCurrentTrack(cue);
    setVolumeState(vol);

    if (cue.source === "soundcloud" && cue.urls.length > 0) {
      const url = cue.urls[Math.floor(Math.random() * cue.urls.length)];
      const pool = scPoolRef.current;

      // Ensure pool is initialized
      if (pool.length === 0 && window.SC?.Widget) {
        for (let i = 0; i < SC_POOL_SIZE; i++) {
          const iframe = document.getElementById(`sc-widget-${i}`) as HTMLIFrameElement;
          if (iframe) pool.push({ widget: window.SC.Widget(iframe), loadedUrl: null, iframeId: `sc-widget-${i}` });
        }
        scPoolRef.current = pool;
      }

      // Find a slot that already has this URL preloaded
      let targetSlot = findSlotWithUrl(url);
      const prevActiveSlot = activeSlotRef.current;

      if (targetSlot === -1) {
        // Not preloaded — load into a free slot
        targetSlot = findFreeSlot(prevActiveSlot);
      }

      if (targetSlot === -1 || !pool[targetSlot]) return;
      const slot = pool[targetSlot];

      // Fade out the previous SC widget if one is active
      if (prevActiveSlot >= 0 && prevActiveSlot !== targetSlot && pool[prevActiveSlot]) {
        fadeWidget(pool[prevActiveSlot].widget, 500);
      }
      // Stop YouTube if switching from YT
      if (activeSourceRef.current === "youtube") ytPlayerRef.current?.stopVideo();

      activeSourceRef.current = "soundcloud";
      activeSlotRef.current = targetSlot;

      const startPlayback = () => {
        slot.widget.play();
        slot.widget.setVolume(vol);
        setIsPlaying(true);
        setAudioUnlocked(true);

        // Set up loop
        try { slot.widget.unbind(window.SC.Widget.Events.FINISH); } catch {}
        if (cue.loop) {
          slot.widget.bind(window.SC.Widget.Events.FINISH, () => {
            slot.widget.seekTo(0);
            slot.widget.play();
          });
        }

        // Preload neighbors
        setTimeout(() => preloadNeighbors(cue), 500);
      };

      if (slot.loadedUrl === url) {
        // Already preloaded — instant play!
        slot.widget.seekTo(0);
        startPlayback();
      } else {
        // Need to load first
        slot.widget.load(url, {
          auto_play: true,
          show_artwork: false, show_comments: false, show_playcount: false,
          show_user: false, buying: false, sharing: false, download: false,
          callback: () => {
            slot.loadedUrl = url;
            slot.widget.play();
            slot.widget.setVolume(vol);
            setIsPlaying(true);
            setAudioUnlocked(true);

            try { slot.widget.unbind(window.SC.Widget.Events.FINISH); } catch {}
            if (cue.loop) {
              slot.widget.bind(window.SC.Widget.Events.FINISH, () => {
                slot.widget.seekTo(0);
                slot.widget.play();
              });
            }
            setTimeout(() => preloadNeighbors(cue), 500);
          },
        });
      }
    } else if (cue.videoIds.length > 0 && ytPlayerRef.current) {
      // Stop any active SC widget
      if (activeSlotRef.current >= 0 && scPoolRef.current[activeSlotRef.current]) {
        fadeWidget(scPoolRef.current[activeSlotRef.current].widget, 500);
      }
      activeSourceRef.current = "youtube";
      activeSlotRef.current = -1;
      const videoId = cue.videoIds[Math.floor(Math.random() * cue.videoIds.length)];
      ytPlayerRef.current.setVolume(vol);
      ytPlayerRef.current.loadVideoById(videoId);
    }
  }, [apiReady]);

  const pause = useCallback(() => {
    if (activeSourceRef.current === "youtube") ytPlayerRef.current?.pauseVideo();
    if (activeSourceRef.current === "soundcloud" && activeSlotRef.current >= 0) {
      scPoolRef.current[activeSlotRef.current]?.widget?.pause();
    }
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (activeSourceRef.current === "youtube") ytPlayerRef.current?.playVideo();
    if (activeSourceRef.current === "soundcloud" && activeSlotRef.current >= 0) {
      scPoolRef.current[activeSlotRef.current]?.widget?.play();
    }
    setIsPlaying(true);
  }, []);

  const stop = useCallback(() => {
    if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }
    if (activeSourceRef.current === "youtube") ytPlayerRef.current?.stopVideo();
    if (activeSourceRef.current === "soundcloud" && activeSlotRef.current >= 0) {
      const w = scPoolRef.current[activeSlotRef.current]?.widget;
      w?.pause();
      w?.seekTo(0);
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    activeSourceRef.current = null;
    activeSlotRef.current = -1;
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setVolumeState(clamped);
    if (activeSourceRef.current === "youtube") ytPlayerRef.current?.setVolume(clamped);
    if (activeSourceRef.current === "soundcloud" && activeSlotRef.current >= 0) {
      scPoolRef.current[activeSlotRef.current]?.widget?.setVolume(clamped);
    }
  }, []);

  const fadeOut = useCallback(() => {
    if (activeSourceRef.current === "soundcloud" && activeSlotRef.current >= 0) {
      fadeWidget(scPoolRef.current[activeSlotRef.current].widget, 500, () => setIsPlaying(false));
    } else if (activeSourceRef.current === "youtube" && ytPlayerRef.current) {
      const startVol = ytPlayerRef.current.getVolume?.() ?? volume;
      const steps = 10;
      let step = 0;
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = setInterval(() => {
        step++;
        ytPlayerRef.current?.setVolume(Math.max(0, Math.round(startVol * (1 - step / steps))));
        if (step >= steps) {
          clearInterval(fadeIntervalRef.current!);
          fadeIntervalRef.current = null;
          ytPlayerRef.current?.pauseVideo();
          ytPlayerRef.current?.setVolume(startVol);
          setIsPlaying(false);
        }
      }, 50);
    }
  }, [volume]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      ytPlayerRef.current?.destroy?.();
    };
  }, []);

  // Unlock audio on first user interaction
  useEffect(() => {
    if (audioUnlocked) return;
    const unlock = () => { setAudioUnlocked(true); document.removeEventListener("touchstart", unlock); document.removeEventListener("click", unlock); };
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("click", unlock, { once: true });
    return () => { document.removeEventListener("touchstart", unlock); document.removeEventListener("click", unlock); };
  }, [audioUnlocked]);

  return (
    <MusicContext.Provider value={{
      currentTrack, isPlaying, volume, playTrack, pause, resume,
      stop, setVolume, fadeOut, allCues, setAllCues, audioUnlocked, apiReady,
    }}>
      {children}
      {/* Hidden YouTube player */}
      <div style={{ position: "fixed", top: -9999, left: -9999, width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true">
        <div id="yt-music-player" />
      </div>
      {/* Hidden SoundCloud widget pool */}
      {Array.from({ length: SC_POOL_SIZE }).map((_, i) => (
        <iframe
          key={i}
          id={`sc-widget-${i}`}
          src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F0&auto_play=false"
          width="0"
          height="0"
          allow="autoplay; encrypted-media"
          style={{ display: "none" }}
        />
      ))}
    </MusicContext.Provider>
  );
}
