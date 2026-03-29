# Rainwave Admin Panel

## Purpose
- Build a dark-mode-only web admin panel in `admin_panel`.
- Target desktop admin use on 1440p+ monitors.
- Use React for rendering, React Query for API access, React Router for navigation/history, MUI for UI components, and Luxon for time zone formatting.

## Scope
- Expose only these capabilities:
  - `admin/js_errors`
  - `admin/music_scan_errors`
  - `admin/add_donation`
  - `admin/power_hours`
  - `admin/power_hour`
  - `admin/create_power_hour`
  - `admin/change_power_hour_name`
  - `admin/change_power_hour_start_time`
  - `admin/change_power_hour_url`
  - `admin/duplicate_power_hour`
  - `admin/europify_power_hour`
  - `admin/delete_power_hour`
  - `admin/add_song_to_power_hour`
  - `admin/add_album_to_power_hour`
  - `admin/order_power_hour_songs`
  - `admin/power_hour_remove_song`
  - `admin/shuffle_power_hour`
  - `admin/albums`
  - `admin/album_songs`
  - `admin/album_art`
  - `admin/set_album_cooldown`
  - `admin/reset_album_cooldown`
  - `admin/set_song_cooldown`
  - `admin/reset_song_cooldown`
  - `admin/set_song_request_only`

## Product Rules
- English only.
- No translation framework.
- Reuse MUI components wherever possible.
- Keep custom styling minimal and boring.
- Use the main site session cookie for auth.
- If auth is missing or an API call fails, show the backend error state directly.
- Power Hour timestamps must always be shown in:
  - browser local time
  - Toronto
  - London

## Current Backend Contract Notes
- The OpenAPI contract now uses:
  - `/api4/admin/change_power_hour_start_time`
  - `/api4/admin/change_power_hour_url`
- `admin/album_songs` now includes:
  - `rating`
  - `rating_count`

## Frontend Structure
- Use `react-router-dom` `BrowserRouter` or data router for page navigation.
- Primary routes:
  - `/js-errors`
  - `/music-scan-errors`
  - `/donations`
  - `/power-hours`
  - `/albums`
- Keep route state in the URL where useful:
  - selected power hour id
  - selected album id
  - selected station id

## Date Handling
- Use `@mui/x-date-pickers` with Luxon.
- Use MUI date-time pickers for Power Hour editing and creation.
- Convert picker values to UTC epoch seconds before sending to the API.

## Implementation Priority
1. App shell, providers, router, theme, and typed API client.
2. Read-only list views for errors, power hours, and albums.
3. Power Hour create/edit flows.
4. Album/song cooldown and request-only actions.
5. Power Hour song ordering and add/remove workflows.
