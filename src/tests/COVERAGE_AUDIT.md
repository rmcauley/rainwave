# Coverage Audit

## Baselines

Initial baseline using `pytest --cov`:

- Command: `uv run pytest --cov --cov-report=term-missing --cov-report=html --cov-report=xml`
- Result: `81 passed`
- Total coverage: `46%`

Current baseline using the working multi-process coverage flow:

- Command: `./scripts/run_coverage.sh -q`
- Result: `92 passed`
- Total coverage: `66%`

Note:

- `pytest --cov` was under-reporting because the test suite runs the API in a separate process.
- The project now uses explicit subprocess coverage via the API test server launch plus `coverage combine`.
- The route surface is healthier than the original `46%` suggested.
- The next HTTP pass should target remaining low-coverage route files directly before moving to module-level tests.

## Disposition Inventory

### `test`
- Untested or thinly tested HTTP route handlers:
  - OAuth/Discord callback flow under `/oauth/discord`
  - remaining admin mutation routes with low file coverage:
    - `admin/add_donation`
    - `admin/set_song_cooldown`
    - `admin/set_album_cooldown`
    - `admin/set_song_request_only`
    - discord-user admin update/search endpoints
  - detail/list routes still below useful route-level confidence:
    - `album`
    - `artist`
    - `group`
    - `listener`
    - `stations`
    - `user_info`
- Shared helper logic exercised primarily through routes:
  - `paginated_requests`
  - `get_station_info`
  - `pretty_date`
  - `user_to_api_private`

### `simplify`
- Redundant default-path or fallback branches that should be reduced instead of tested just for percentage:
  - branch-heavy validation/default helpers where one arm is already the structural default
  - route/handler setup code that duplicates an unconditional fallback path
- Keep this bucket narrow and use it only after route coverage is materially better.

### `defer`
- Process entrypoints and infrastructure:
  - `rw_api.py`
  - `api/server.py`
  - backend server entrypoints/callbacks
  - websocket server/listener code
- Scanner modules
- Low-level library helpers not currently reached by HTTP coverage work

### `remove`
- No removal candidates have been committed yet.
- Expected likely candidates after the next audit:
  - stale compatibility code
  - unreferenced one-off helpers
  - branches preserved only for prior architecture paths

## Missing HTTP Surface

Route groups completed in the first expansion batch:

- Admin power hours:
  - `admin/create_power_hour`
  - `admin/power_hour`
  - `admin/power_hours`
  - `admin/add_song_to_power_hour`
  - `admin/add_album_to_power_hour`
  - `admin/move_song_up_in_power_hour`
  - `admin/power_hour_remove_song`
  - `admin/shuffle_power_hour`
  - `admin/change_power_hour_name`
  - `admin/change_producer_url`
  - `admin/change_producer_start_time`
  - `admin/duplicate_power_hour`
  - `admin/europify_power_hour`
  - `admin/delete_power_hour`
- Browser/auth:
  - `/oauth/login`
  - `/oauth/logout`
  - `/oauth/debug`
  - `/oauth/tos_privacy`
  - `/widget/*`
  - `/twitch/*`
  - `/tune_in/*`
  - `/test/create_user`
- Keys:
  - `/keys/app`
  - authenticated `/keys/`
  - authenticated `/keys/create`
  - authenticated `/keys/delete`
- API and HTML route coverage:
  - `bootstrap`
  - `clear_rating`
  - `request`
  - `order_requests`
  - `request_unrated_songs`
  - `playback_history`
  - `/pages/*` wrappers for:
    - `playback_history`
    - `request_line`
    - `user_requested_history`
    - `all_faves`
    - `top_100`
    - `unrated_songs`
    - `user_recent_votes`
    - `tip_jar`

Remaining likely HTTP surface gaps for the next pass:
- Second expansion batch completed:
  - `admin/js_errors`
  - `/oauth/discord` test-mode entry/callback failure paths
  - `/twitch/`
  - `/twitch/widget`
  - `/tune_in/*.ogg.m3u`
- Current HTTP route-surface status:
  - all registered HTTP route handlers now have direct test coverage
  - exception: websocket upgrade endpoint `/api4/websocket/(sid)` is not part of the HTTP request suite and should be treated separately
- Remaining route work is no longer route-surface discovery:
  - deepen branch coverage inside already-tested handlers
  - decide whether config-dependent OAuth success paths should be covered with narrower setup or left for a later integration slice

## Checkpoint Intent

Checkpoint 1 should be:

- this audit document
- the subprocess-coverage harness fix
- the first missing-route HTTP test batch

Status:

- Checkpoint 2 is ready for audit and commit.
- The next pass should move from route-surface coverage to branch/deeper module coverage.

## Coverage Command

Use:

```bash
./scripts/run_coverage.sh
```

Do not use `pytest --cov` as the authoritative project coverage command for this repo.
