# Session Music Integration — Feature Spec

## Overview

Add an integrated music player to the DM session viewer. Music cues are embedded in the session prep markdown, linked to unlisted YouTube videos, and controlled with a single tap during play. No file uploads, no audio hosting, no storage costs — just YouTube embeds with programmatic control.

## Why This Works

- **Zero storage cost.** Music lives on YouTube as unlisted videos. The app just streams them.
- **Zero bandwidth cost.** YouTube handles all audio delivery.
- **Unlisted ≠ private.** Unlisted videos can be embedded and streamed but won't appear in search or on your channel. Only people with the link (or your app) can access them.
- **YouTube IFrame API** gives full control: play, pause, stop, loop, volume, seek — all from JavaScript.
- **The DM is already looking at the session viewer.** The music controls live right there, in context, next to the room description where they're needed.

---

## Part 1: Authoring — Music Cues in Session Markdown

### New Callout Type: `[!music]`

Add a new callout type to the authoring spec. Music cues are placed inline in the session prep wherever the DM should change the music.

**Syntax:**

```markdown
> [!music] Mansion Exploration
> id: dQw4w9WgXcQ
> loop: true
```

**Fields:**
- **Label** (after `[!music]`): Display name shown on the music control — e.g., "Mansion Exploration", "Combat — High Danger"
- **id**: YouTube video ID (the 11-character string after `v=` in a YouTube URL). Multiple IDs can be comma-separated for a playlist that shuffles/cycles.
- **loop** (optional, default `true`): Whether the track loops when it ends.
- **volume** (optional, default `30`): Initial volume percentage (0-100). Background music should default low.

**Multiple tracks per cue (playlist mode):**

```markdown
> [!music] Combat — Standard
> id: abc123xyz99, def456uvw88
> loop: true
```

When multiple IDs are provided, the player picks one randomly on each play (or cycles through them). This prevents the same combat music every single fight.

**Example placement in session prep:**

```markdown
### M3. Library {tags: upper-floor, combat, high-danger}

> [!music] Combat — High Danger
> id: xyz789abc12
> loop: true

> [!read-aloud]
> This room is enormous — floor-to-ceiling bookshelves line every wall...
```

The music cue appears right before the read-aloud text, so the DM sees it at exactly the moment they need to change the music. One tap, music changes, keep reading.

---

## Part 2: Parser Changes

### New Token Type: `music`

Add `music` to the session parser's token types. The parser should extract:

```typescript
interface MusicCue {
  type: 'music';
  label: string;        // "Combat — High Danger"
  videoIds: string[];   // ["xyz789abc12"] or ["abc123", "def456"]
  loop: boolean;        // default true
  volume: number;       // default 30
}
```

**Parser behavior:**
- Detect `> [!music]` callouts using the existing callout parsing logic
- Extract the label from the callout header
- Parse `id:`, `loop:`, and `volume:` from the callout body lines
- Split comma-separated IDs into an array
- Add to the room/section's content blocks

---

## Part 3: Session Viewer — Music Controls

### Music Cue Buttons (Inline)

When the parser encounters a `[!music]` block, render it as a compact, tappable button inline in the session content:

```
┌─────────────────────────────────┐
│  🎵  Combat — High Danger  [▶] │
└─────────────────────────────────┘
```

**Behavior on tap:**
1. Fade out the currently playing track (500ms fade)
2. Start the new track at the specified volume
3. Button changes to show it's the active track: highlighted border, playing indicator
4. If the same button is tapped again, pause/resume

**Styling:**
- Compact horizontal bar, sits between content blocks
- Amber accent border to distinguish from other callout types
- Small music note icon
- Play/pause indicator on the right side
- Visually distinct from read-aloud blocks, DM notes, etc.

### Persistent Music Control Bar

Add a **sticky mini-player** at the bottom of the session viewer (above the existing quick reference FAB):

```
┌─────────────────────────────────────────────┐
│  🎵 Mansion Exploration  ▶ ■  🔊━━━━○━━━━  │
└─────────────────────────────────────────────┘
```

**Elements:**
- **Track name** — currently playing track label
- **Play/Pause** button
- **Stop** button — fades out and stops
- **Volume slider** — horizontal, small
- **Nothing playing state:** bar is collapsed/hidden or shows "No track playing"

This bar is always visible so the DM can adjust volume or stop music without scrolling back to find the music cue button.

### Quick Reference Panel — Music Tab

Add a **Music** tab to the existing quick reference bottom sheet (alongside NPCs, Puzzles, Treasure, Map). This tab lists ALL music cues from the current session in order:

```
┌─────────────────────────────────────┐
│  MUSIC                              │
│                                     │
│  🎵 Candlekeep Arrival         [▶] │
│  🎵 Candlekeep Interior        [▶] │
│  🎵 Something's Wrong          [▶] │
│  🎵 Portal Crossing            [▶] │
│  🎵 Mansion Exploration      ♪ [▶] │  ← currently playing
│  🎵 Combat — Standard          [▶] │
│  🎵 Combat — High Danger       [▶] │
│  🎵 Comedy / Breather          [▶] │
│  🎵 Cumin and Coriander        [▶] │
│  🎵 Arboretum — Faerie Dragons [▶] │
│  🎵 Planetarium — Puzzle       [▶] │
│  🎵 Chained Library — Dread    [▶] │
│  🎵 Discovery                  [▶] │
│  🎵 The Exit                   [▶] │
│  🎵 Keeper's Offer             [▶] │
│                                     │
└─────────────────────────────────────┘
```

This gives the DM a **full jukebox view** — they can switch to any track from anywhere in the session without scrolling to find the inline cue. One tap from the Music tab, the track plays.

---

## Part 4: YouTube IFrame API Integration

### Setup

Load the YouTube IFrame API asynchronously. It's a single script tag:

```html
<script src="https://www.youtube.com/iframe_api" async></script>
```

### Player Component

Create a hidden YouTube player component that handles all playback. The actual YouTube iframe is **invisible** (0x0 pixels or off-screen) — we only want the audio.

```typescript
// YouTubePlayer.tsx (simplified)

interface MusicPlayerState {
  currentTrack: MusicCue | null;
  isPlaying: boolean;
  volume: number;
}

// Create hidden YT player
const player = new YT.Player('yt-player-container', {
  height: '0',
  width: '0',
  videoId: '', // Set dynamically
  playerVars: {
    autoplay: 0,
    controls: 0,
    loop: 1,      // Will be set per track
    modestbranding: 1,
    playsinline: 1,
  },
  events: {
    onReady: onPlayerReady,
    onStateChange: onPlayerStateChange,
  },
});

function playTrack(cue: MusicCue) {
  // Pick a random video ID if multiple provided
  const videoId = cue.videoIds[Math.floor(Math.random() * cue.videoIds.length)];
  
  // Fade out current track, then:
  player.loadVideoById(videoId);
  player.setVolume(cue.volume);
  
  if (cue.loop) {
    // YouTube loop: set playlist to the same video
    player.loadPlaylist([videoId], 0, 0);
    player.setLoop(true);
  }
}

function fadeOut(duration = 500) {
  // Gradually reduce volume to 0 over duration, then pause
  const steps = 10;
  const interval = duration / steps;
  const volumeStep = player.getVolume() / steps;
  
  let currentStep = 0;
  const timer = setInterval(() => {
    currentStep++;
    player.setVolume(Math.max(0, player.getVolume() - volumeStep));
    if (currentStep >= steps) {
      clearInterval(timer);
      player.pauseVideo();
    }
  }, interval);
}
```

### Important: Mobile Autoplay Restrictions

Mobile browsers block autoplay of audio/video without user interaction. The **first** play must be triggered by a user tap. After that, subsequent `loadVideoById` calls work without additional interaction.

**Solution:** The first music cue tap satisfies the autoplay requirement. All subsequent track switches work automatically. If the DM opens the session viewer fresh, they'll need to tap a music button once to "unlock" audio. Add a small "🔇 Tap to enable music" indicator in the music bar until the first interaction.

### Offline / PWA Considerations

YouTube streaming requires an internet connection. Since the app is a PWA that might be used in areas with poor connectivity:

- **Graceful degradation:** If YouTube fails to load, the music buttons show a disabled state with a tooltip: "Music requires internet connection"
- **Don't block the session viewer.** Music is an enhancement, not a requirement. If the API fails to load, everything else works normally.
- The YouTube IFrame API script should load **async** and **not block** the main app bundle

---

## Part 5: Database Changes

No database changes needed. Music cues live entirely in the session markdown and are parsed at render time. The YouTube video IDs are just strings in the markdown — no storage, no uploads, no new tables.

If you later want to save DM preferences (like custom volume per track), that could go in the existing `session_state` JSON blob alongside puzzle tracker state.

---

## Part 6: Authoring Spec Update

Add to `AUTHORING_SPEC.md`:

```markdown
### Music Cues

Use `[!music]` callouts to embed music triggers in your session prep.
These render as tappable play buttons in the session viewer.

**Basic usage:**
> [!music] Track Name
> id: YOUTUBE_VIDEO_ID
> loop: true

**Fields:**
- Label (required): Display name for the track
- id (required): YouTube video ID (11 characters). Comma-separate multiple IDs for playlist mode.
- loop (optional, default true): Whether to loop the track
- volume (optional, default 30): Initial volume (0-100)

**Playlist mode (random selection):**
> [!music] Combat Music
> id: abc123, def456, ghi789
> loop: true

**Placement:** Put music cues at the start of a room or scene, before the read-aloud text.
The DM sees the play button right when they need to change the music.

**Upload your music:**
1. Upload your tracks to YouTube as **unlisted** videos
2. Copy the video ID from the URL (the part after `v=`)
3. Paste it into the `id:` field

Unlisted videos won't appear in search or on your channel.
Only people with the direct link (or your app) can play them.
```

---

## Implementation Priority

| Step | Work | Effort |
|---|---|---|
| 1 | Add `[!music]` to parser | Small — follows existing callout pattern |
| 2 | Render inline music buttons in session viewer | Small — new component, simple UI |
| 3 | YouTube IFrame API integration (hidden player) | Medium — API setup, state management |
| 4 | Sticky mini-player bar | Small — fixed-position component |
| 5 | Music tab in quick reference panel | Small — list of all music cues with play buttons |
| 6 | Fade transitions between tracks | Small — volume animation |
| 7 | Mobile autoplay handling | Small — first-tap unlock pattern |

Total effort: **Medium.** The YouTube API does the heavy lifting. Most of the work is UI (buttons, mini-player bar) and parser additions (one new callout type following the existing pattern).

---

## How the DM Uses It

### Before the Session

1. Generate tracks in Suno
2. Upload each track to YouTube as an **unlisted** video
3. Copy the video IDs
4. Add `[!music]` callouts to the session prep markdown, one per location/mood change
5. Upload the updated session prep to the app
6. Test: open the session viewer, tap a few music buttons, confirm they play

### During the Session

1. Open session viewer on phone or tablet
2. Tap the first music cue (Candlekeep Arrival) — this unlocks audio
3. As you read through the session, music cues appear inline at the right moments
4. Tap to switch tracks. One tap. Done.
5. Use the sticky mini-player to adjust volume or pause
6. For unexpected situations, open the Music tab in quick reference for the full jukebox
7. Stop all music with the stop button when you want silence

### The Experience

The DM is reading the session prep. They scroll to M7 (Dining Room). Right before the read-aloud text, they see:

```
🎵 Combat — High Danger  [▶]
```

They tap it. The exploration music fades out over half a second. The heavy war drums and dissonant strings fade in. They start reading: "An elegant dining room. A crystal chandelier..." The music is already building tension before they describe the seventh chair. The players feel it before they know what's coming.

That's the goal.
