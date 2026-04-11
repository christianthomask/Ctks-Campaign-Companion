# Music Integration Refit — SoundCloud Support

## Why the Change

YouTube's daily upload limit blocks rapid iteration. SoundCloud allows unlimited uploads from a free account with no daily cap, no video conversion required (audio files upload directly), and tracks can be set to private. The Widget API provides full programmatic control: play, pause, volume, seek, and loop — everything we need.

This spec replaces the YouTube-only implementation with **SoundCloud as the primary source**, while keeping YouTube as a supported fallback for tracks already uploaded there.

---

## Updated Authoring Spec — `[!music]` Callout

### New `source` Field

The music callout now supports a `source` field to specify the provider. If omitted, defaults to `soundcloud`.

**SoundCloud (new default):**
```markdown
> [!music] Mansion Exploration
> source: soundcloud
> url: https://soundcloud.com/your-username/mansion-exploration
> loop: true
> volume: 25
```

**YouTube (still supported):**
```markdown
> [!music] Candlekeep Approach
> source: youtube
> id: HeYp88xmifY
> loop: true
> volume: 30
```

### Field Reference

| Field | Required | Default | Description |
|---|---|---|---|
| Label | Yes | — | Display name (after `[!music]`) |
| source | No | `soundcloud` | `soundcloud` or `youtube` |
| url | Yes (SoundCloud) | — | Full SoundCloud track URL |
| id | Yes (YouTube) | — | YouTube video ID(s), comma-separated |
| loop | No | `true` | Whether to loop the track |
| volume | No | `30` | Initial volume (0-100) |

### Multiple Tracks (Playlist Mode)

For SoundCloud, comma-separate multiple URLs:
```markdown
> [!music] Combat — Standard
> source: soundcloud
> url: https://soundcloud.com/you/combat-1, https://soundcloud.com/you/combat-2
> loop: true
```

The player picks one randomly on play, same as the YouTube playlist behavior.

---

## Parser Changes

### Updated `MusicCue` Interface

```typescript
interface MusicCue {
  type: 'music';
  label: string;
  source: 'soundcloud' | 'youtube';
  urls: string[];        // SoundCloud track URLs
  videoIds: string[];    // YouTube video IDs (legacy support)
  loop: boolean;
  volume: number;
}
```

### Parser Logic

When parsing a `[!music]` callout:
1. Read `source:` line — default to `soundcloud` if absent
2. If `soundcloud`: read `url:` line, split by comma, trim, store in `urls[]`
3. If `youtube`: read `id:` line, split by comma, trim, store in `videoIds[]`
4. Read `loop:` and `volume:` as before

---

## SoundCloud Widget Integration

### Loading the API

Add the SoundCloud Widget API script. Single file, load async:

```html
<script src="https://w.soundcloud.com/player/api.js" async></script>
```

### Hidden Widget Player

SoundCloud requires an iframe — the Widget API controls it programmatically. The iframe is hidden.

```tsx
// SoundCloudPlayer.tsx

import { useRef, useEffect } from 'react';

export function SoundCloudPlayer({ onReady }: { onReady: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const initWidget = () => {
      if (typeof window !== 'undefined' && (window as any).SC) {
        const widget = (window as any).SC.Widget(iframeRef.current);
        widget.bind((window as any).SC.Widget.Events.READY, onReady);
      } else {
        setTimeout(initWidget, 100);
      }
    };
    initWidget();
  }, [onReady]);

  return (
    <iframe
      ref={iframeRef}
      id="sc-widget"
      src="https://w.soundcloud.com/player/?url=https://soundcloud.com/"
      width="0"
      height="0"
      allow="autoplay"
      style={{ display: 'none' }}
    />
  );
}
```

### Playback Control

```typescript
function getWidget(): any {
  return (window as any).SC.Widget(document.getElementById('sc-widget'));
}

function playSoundCloudTrack(url: string, loop: boolean, volume: number) {
  const widget = getWidget();

  // Unbind previous FINISH listeners to prevent stale loop handlers
  widget.unbind((window as any).SC.Widget.Events.FINISH);

  widget.load(url, {
    auto_play: true,
    show_artwork: false,
    show_comments: false,
    show_playcount: false,
    show_user: false,
    buying: false,
    sharing: false,
    download: false,
    callback: () => {
      widget.setVolume(volume);

      if (loop) {
        // SoundCloud has no native loop — listen for FINISH and restart
        widget.bind(
          (window as any).SC.Widget.Events.FINISH,
          () => {
            widget.seekTo(0);
            widget.play();
          }
        );
      }
    }
  });
}

function pauseSoundCloud() {
  getWidget().pause();
}

function resumeSoundCloud() {
  getWidget().play();
}

function stopSoundCloud() {
  const widget = getWidget();
  widget.pause();
  widget.seekTo(0);
}

function setSoundCloudVolume(volume: number) {
  // SoundCloud volume is 0-100, same as our spec
  getWidget().setVolume(volume);
}

function fadeOutSoundCloud(duration: number = 500) {
  const widget = getWidget();
  widget.getVolume((currentVolume: number) => {
    const steps = 10;
    const interval = duration / steps;
    const volumeStep = currentVolume / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      widget.setVolume(Math.max(0, currentVolume - (volumeStep * step)));
      if (step >= steps) {
        clearInterval(timer);
        widget.pause();
        widget.seekTo(0);
      }
    }, interval);
  });
}
```

---

## Unified Music Player

The session viewer needs one controller that routes to the right player based on source:

```typescript
function playMusicCue(cue: MusicCue) {
  const onReady = () => {
    if (cue.source === 'soundcloud') {
      const url = cue.urls[Math.floor(Math.random() * cue.urls.length)];
      playSoundCloudTrack(url, cue.loop, cue.volume);
    } else if (cue.source === 'youtube') {
      const videoId = cue.videoIds[Math.floor(Math.random() * cue.videoIds.length)];
      playYouTubeTrack(videoId, cue.loop, cue.volume);
    }
  };

  // Fade out whatever is currently playing, then start new track
  fadeOutCurrentTrack(onReady);
}

function fadeOutCurrentTrack(callback: () => void) {
  // Determine which player is active and fade it
  // Then call callback to start the new track
}

function stopAllMusic() {
  stopSoundCloud();
  stopYouTube();  // if YouTube player exists
}
```

Both iframes (SoundCloud + YouTube) live in the DOM. Only one plays at a time. When switching between sources, the old player is stopped before the new one starts.

---

## UI — No Changes Needed

The inline music buttons, sticky mini-player bar, and Music tab in quick reference are all source-agnostic. They call `playMusicCue(cue)` regardless of whether it's SoundCloud or YouTube. No UI changes required.

Optional cosmetic touch: show a small SoundCloud or YouTube icon in the mini-player to indicate the source.

---

## SoundCloud Upload Guide for the DM

### Setup

1. Create a free account at soundcloud.com
2. Free tier: **3 hours of upload time** (~45 tracks at 4 min each)
3. No daily upload limit
4. Audio files upload directly — mp3, wav, flac, aiff, ogg all supported
5. No video conversion needed

### Uploading

1. Tap **Upload** on soundcloud.com
2. Select audio files (can select multiple)
3. Set privacy to **Private** for each track
4. Title each track clearly (e.g., "S1 - Mansion Exploration")
5. Save

### Getting Track URLs

For **public** tracks, the URL is:
```
https://soundcloud.com/your-username/track-name
```

For **private** tracks, SoundCloud generates a share URL with a secret token:
```
https://soundcloud.com/your-username/track-name/s-AbCdEfGhI
```

Use the **full URL including the secret token** in your `[!music]` callout. Without the token, private tracks won't load in the widget.

**Simplest approach:** Set tracks to Public. Your SoundCloud profile is unlikely to be discovered by anyone unless you share it. For a D&D campaign OST, discoverability isn't a concern.

### Bulk Upload

SoundCloud supports selecting **multiple files at once** in the upload dialog. You can upload all 10-15 tracks for a session in a single batch, set titles, and save. No daily limit, no waiting.

---

## Migration — Existing YouTube Tracks

The 10 Session 1 tracks already on YouTube stay as-is. Add `source: youtube` explicitly to their `[!music]` callouts:

```markdown
> [!music] Candlekeep Approach
> source: youtube
> id: HeYp88xmifY
> loop: true
> volume: 25
```

All new tracks (remaining Session 1 + all Session 2) go to SoundCloud:

```markdown
> [!music] Cumin and Coriander — Kitchen
> source: soundcloud
> url: https://soundcloud.com/your-username/kitchen-theme
> loop: true
> volume: 25
```

Both sources work simultaneously in the same session. The player doesn't care.

---

## Key Differences from YouTube

| Concern | YouTube | SoundCloud |
|---|---|---|
| Hidden player | 0x0 iframe | `display: none` iframe |
| Load a track | `player.loadVideoById(id)` | `widget.load(url, options)` |
| Play | `player.playVideo()` | `widget.play()` |
| Pause | `player.pauseVideo()` | `widget.pause()` |
| Volume | `player.setVolume(0-100)` | `widget.setVolume(0-100)` |
| Loop | `player.setLoop(true)` | Manual: FINISH event → seekTo(0) → play() |
| Script | `youtube.com/iframe_api` | `w.soundcloud.com/player/api.js` |
| Track identifier | 11-char video ID | Full track URL |
| Upload format | Video (mp4) required | Audio (mp3/wav) direct |
| Upload limit | Daily cap | 3 hours total (free tier) |
| Privacy | Unlisted | Private with secret token, or Public |

The patterns are nearly identical. The only real implementation difference is loop handling — SoundCloud needs the manual FINISH → seekTo → play approach.

---

## Implementation Priority

| Step | Work | Notes |
|---|---|---|
| 1 | Add `source` and `url` to parser | Small — extend existing callout |
| 2 | SoundCloud iframe + Widget API | Medium — mirrors YouTube pattern |
| 3 | Unified playback controller | Small — routing wrapper |
| 4 | Loop via FINISH event | Small — few lines |
| 5 | Fade transitions for both sources | Small — already specced |
| 6 | Mobile autoplay first-tap unlock | Small — same pattern |

If the YouTube player is already built, this is roughly the same amount of code again for SoundCloud, plus a thin routing layer on top. Total effort: **Medium.**
