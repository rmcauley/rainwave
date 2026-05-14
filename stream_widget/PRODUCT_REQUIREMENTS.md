# Rainwave Stream Widget Rewrite Requirements

## Intention

The stream widget is a browser-source overlay for Twitch streamers. Its job is to show Rainwave's current track cleanly on top of a live stream scene, with enough customization that it remains readable over games, static images, and solid-color layouts.

The rewrite should replace `stream_widget/legacy` with a modern, typed, maintainable implementation while preserving the product behavior that matters to streamers:

- A stable OBS/Twitch-overlay URL that can be added as a browser source.
- A configuration flow that creates that overlay URL.
- Live now-playing updates from Rainwave.
- Album art, song title, artist information, optional request attribution, optional header text, and optional Rainwave attribution.
- Layout and styling controls suitable for stream overlays.
- A separate static artifact that can be built and deployed independently from the main frontend.

The rewrite should reuse the existing typed Rainwave API client exported from `frontend/src/rainwaveApi/index.ts` where practical. That module should stay in the `frontend` directory; the widget should reference it through TypeScript/Vite configuration or a small local wrapper, not by moving or duplicating it.

## Source Findings

### Legacy Widget

`stream_widget/legacy/stream_templates.js` is a generated/minified UI template for a widget customizer. It exposes:

- Station selection: All, Game, OverClocked ReMix, Covers, Chiptune.
- Preset questions for placement, capture size, background type, header text, and Rainwave shoutout preference.
- Advanced options for layout, album art size, text alignment, animation, visibility duration, artist visibility, colors, shadows, font, width, padding, header, Rainwave attribution, and display delay.

`stream_widget/legacy/stream_utility.js` contains the default styling and CSS generation behavior:

- Defaults: white text, Roboto Condensed, 18pt font, black 2px text stroke, `3px 3px 3px black` shadow, 8px padding, left text alignment.
- Header defaults to `Current Song`, orange `#FFC96A`, uppercase, and 70% of body font size.
- Album art can be above, below, left, right, or hidden.
- A configurable delay exists for stream/audio sync.

`stream_widget/legacy/old-http-api.js` and `old-lyre-ajax.js` are old XHR API clients. They maintain sync state, retry on errors, emit callbacks keyed by API response fields, track the current schedule id, handle station-offline/station-paused states, and queue async requests. They should not be carried forward as-is.

### Modern API Client

`frontend/src/rainwaveApi/index.ts` exports a singleton `api` built from `RainwaveApi`.

`frontend/src/rainwaveApi/rainwave.ts` already provides the behavior the widget needs:

- WebSocket connection to `wss://core.rainwave.cc/api4/websocket/`.
- `setOptions({ userId, apiKey, sid, url?, debug?, onSocketError? })`.
- `startWebSocketSync()` and `stopWebSocketSync()`.
- Event listeners for schema keys such as `sched_current`, `sync_result`, and SDK-level error clearing.
- Automatic reconnect, pinging, request queueing, stalled-socket handling, and schedule-id synchronization.
- Typed payloads generated from the OpenAPI schema.

The widget should prefer this client over reimplementing XHR sync.

## Users

Primary user: a Twitch streamer who listens to Rainwave during a stream and wants viewers to see what is playing.

Secondary user: a Rainwave maintainer who needs the widget to be easy to update when API schemas, station metadata, or frontend tooling changes.

Viewer: a stream audience member who should be able to identify the song quickly without the overlay distracting from the stream.

## Product Goals

- Provide an overlay that can be added to OBS or Twitch overlay tooling as a browser source.
- Keep current song information correct and low-latency.
- Make setup simple for non-developer streamers.
- Keep advanced styling flexible enough for varied stream scenes.
- Replace legacy generated JavaScript and XHR sync with typed TypeScript modules.
- Share Rainwave API behavior with the main frontend instead of maintaining a second API client.

## Non-Goals

- The widget is not a full Rainwave client: no voting, rating, request management, login flow, playlist browsing, or station playback.
- The rewrite should not move `frontend/src/rainwaveApi`.
- The initial rewrite does not need to preserve every legacy implementation detail if the user-visible overlay behavior remains covered.
- The widget should not require streamers to install local software beyond using a hosted or built browser-source URL.
- A browser-level smoke test for transparent rendering is not required for the rewrite.

## Core Requirements

### Overlay Runtime

- Render a transparent-background browser page intended for OBS/browser-source use.
- Read configuration from the URL query string or hash so a generated overlay URL is self-contained.
- Preserve legacy URL parameter names exactly. The implementation may use clearer internal names, but generated URLs and parsed incoming URLs must remain compatible with existing widget URLs.
- Connect to Rainwave for the selected station and update on `sched_current`.
- Authenticate as anonymous user id `1` using an API key via `fetch('/api4/bootstrap')` - use GET with accept headers for application/json to obtain the bootstrap object in the main page startup flow, which will include a user object with an API key, before proceeding with the rest of the page loading. The fetch of bootstrap does not need to be made before the Rainwave API instancing.
- Display the currently playing song from the current schedule entry.
- Show at minimum:
  - Song title.
  - Artist names, unless disabled.
  - Album name when space/layout allows.
  - Album art, unless disabled or unavailable.
- Use Rainwave's no-art fallback when a track has no album art.
- Show a clear offline/retrying state only when useful; avoid large distracting error UI in normal reconnects.
- Keep the last known song visible during short reconnects.
- Support an optional display delay, in seconds, so streamers can align overlay changes with their audio relay/player delay.
- Support an optional "show for N seconds after song change" mode and an "always show" mode.
- Avoid layout shifts on song changes.
- Fit long titles and artist lists without overflowing the configured overlay bounds.
- Upon the Rainwave API class throwing an authentication error, trigger a window.location.reload to fetch a new API key.

### Data Mapping

- Use `sched_current.songs[0]` as the now-playing source for normal current-song display unless the API exposes a more explicit current song field.
- Map the song fields from the OpenAPI schema:
  - `title` from `_timeline_song`.
  - `artists` from `_timeline_song.artists`.
  - `album` and art from `_timeline_song.albums[0]`.
  - Request attribution from `elec_request_username` when `show_requesters` is enabled and present.
- Construct album art URLs according to the schema guidance: album art path plus a size suffix, with fallback no-art asset.

### Configuration Builder

- Provide a local configuration UI for streamers to choose station, layout, visual style, animation, and timing.
- Allow streamers to target either a light or dark presentation so default colors, shadows, strokes, and contrast are appropriate for the stream scene.
- Populate the station selector by fetching `/api4/stations` directly. This endpoint is independent of the Rainwave API client setup, requires no authentication, and returns JSON.
- Generate a browser-source URL that can be pasted into OBS.
- Show a live preview using the same renderer as the overlay runtime.
- Keep configuration state serializable into URL parameters.
- Validate CSS-like inputs enough to avoid broken layouts where possible.

### Supported Configuration

The rewrite should preserve these legacy concepts, even if labels and UI controls are modernized:

- `sid`: station id.
- `layout`: `art_top`, `art_bottom`, `art_left`, `art_right`.
- `art_size`: including a no-art value.
- `text_align`: left, center, right.
- `anim_in` and `anim_out`: top, bottom, left, right, fade.
- `show_duration_when_changed`: timed visibility or always visible.
- `show_artist`: show/hide artist text.
- `color`, `background_color`, `box_shadow`.
- `font_size`, `font_family`.
- `text_stroke_color`, `text_stroke_size`, `text_shadow`.
- `art_shadow`.
- `max_width`, `padding`.
- `np_header`, `np_message`, `np_color`.
- `ad` and `ad_message` for optional Rainwave attribution.
- `delay` for delayed display updates.
- `presentation_mode`: light or dark presentation target.

The `ad` URL parameter must remain named `ad` for compatibility. The implementation may map it to a clearer internal name such as `attributionFrequency`.

`presentation_mode` is a new URL parameter for the rewrite. It should default to `dark` to preserve the legacy white-text, dark-shadow overlay behavior. In `light` mode, generated defaults should favor dark text and lighter/no text stroke or shadow so the widget remains readable over light stream layouts. Explicit user-provided CSS values should override mode defaults.

Preset configuration should cover:

- Overlay placement: top-left, top-center, top-right, center-left, center-right, bottom-left, bottom-center, bottom-right.
- Capture size: 480p, 720p, 1080p, 1440p, 2160p.
- Background type: solid color, image, game.
- Presentation target: light or dark.
- Header preference: Now Playing, Current Music, Current Song, or no header.
- Rainwave attribution preference.

`preset_size`/capture size is a legacy URL concept and must keep the same URL parameter name and accepted values. In the configuration UI, this should be presented as "Widget sizing" rather than the streamer's monitor or capture resolution. The UI may expose the setting as a percentage scale derived from the legacy resolution values, because the actual behavior is to control the overall widget size.

`preset_layout`/overlay placement is also a legacy URL concept and must keep the same URL parameter name and accepted values. It must not set the widget's absolute placement within the HTML page. Streamers position the browser source in OBS or their overlay tool. This setting controls the direction of animated transitions inside the widget so motion matches the intended scene placement. For example, a left-side placement should animate the old song to the right while fading out and animate the new song in from the left while fading in, as if it entered from off screen.

### Rainwave Attribution

- Keep attribution optional and streamer-controlled.
- If enabled, show Rainwave branding/message briefly after a configurable number of songs.
- Do not interrupt the now-playing display during critical song-change moments.
- Use the same visual style as song information so it feels like part of the overlay.

### API Reuse

- Use `frontend/src/rainwaveApi/index.ts` or the underlying `RainwaveApi` class instead of copying legacy API clients.
- Do not move `frontend/src/rainwaveApi`.
- Configure `stream_widget/tsconfig.json` and Vite so imports from the frontend API module type-check and bundle reliably.
- Avoid importing unrelated frontend UI code into the widget bundle.
- If the singleton `api` is too global for tests or multiple preview instances, import `RainwaveApi` directly from `frontend/src/rainwaveApi/rainwave.ts` through a local wrapper while keeping source ownership in `frontend`.
- Load or fetch bootstrap data using the same `/api4/bootstrap` pattern as `frontend/index.html`, then initialize the API client with `userId: 1`, the bootstrap-provided anonymous API key, and the station id from the widget URL.

### Build And Tooling

- Use the existing Vite/TypeScript setup in `stream_widget`.
- Build as a separate static artifact.
- Add a real `dev`, `build`, `test`, and `typecheck` script set.
- Keep strict TypeScript enabled.
- Add focused unit tests for:
  - Config parsing and defaulting.
  - URL serialization.
  - Schedule payload to now-playing view model mapping.
  - Delay and timed-visibility behavior.
  - Album art URL generation and fallback.
  - Presentation-mode defaults and explicit style overrides.

## UX Requirements

- The overlay should be readable over busy games without requiring custom CSS.
- The overlay should provide sensible light and dark presentation defaults so streamers do not need to hand-tune contrast for common scene styles.
- The default visual style should be compact and suitable for a stream scene, not a website landing page.
- The configuration UI should prioritize common streamer choices first, with advanced CSS controls separated from presets.
- The generated URL should be obvious and easy to test.
- The overlay should tolerate browser refreshes and reconnect automatically.
- The widget should not visibly flash empty content during startup if a previous or sample preview state is available.

## Technical Shape

Suggested module boundaries:

- `src/config/`: parse, validate, default, and serialize widget configuration.
- `src/rainwave/`: local adapter around `frontend/src/rainwaveApi`.
- `src/nowPlaying/`: convert Rainwave schedule payloads into display view models.
- `src/overlay/`: render and animate the browser-source overlay.
- `src/builder/`: configuration UI and preview.
- `src/styles/`: base CSS plus generated CSS variables from config.

The renderer should be framework-light unless a framework is already chosen for this package. The current package has no runtime UI dependency, so plain TypeScript plus DOM rendering is acceptable for the first rewrite.

## Decisions And Open Questions

Resolved:

- The widget should build as a separate static artifact.
- Public overlay URLs should use anonymous user id `1` and an API key fetched through `/api4/bootstrap`, matching the frontend bootstrap setup.
- Legacy URL parameters must remain backward-compatible.
- `preset_size` keeps its URL name and legacy values, but the configuration UI should describe it as widget scale/sizing.
- `preset_layout` keeps its URL name and legacy values, but controls transition direction rather than HTML page placement.
- The configuration UI should fetch station metadata from unauthenticated `/api4/stations`.
- `ad` remains the compatibility URL parameter for attribution frequency; internal code may use clearer naming such as `attributionFrequency`.
- `presentation_mode` is a new URL parameter for targeting light or dark overlay presentation, defaulting to `dark`.

## Acceptance Criteria

- A streamer can open the configuration page, choose a station and visual preset, copy a URL, and add it as an OBS browser source.
- The overlay updates when Rainwave emits a new `sched_current` event.
- The overlay remains readable and stable with long song titles, long artist lists, missing art, and reconnects.
- The widget bundle does not include the old XHR clients.
- The widget consumes the shared typed Rainwave API module without moving it from `frontend/src/rainwaveApi`.
- Existing legacy widget URLs continue to parse because parameter names and accepted values are preserved.
- Streamers can select light or dark presentation in the configuration UI, and generated URLs preserve that selection.
- Config parsing, now-playing mapping, art fallback, and timing behavior are covered by automated tests.
