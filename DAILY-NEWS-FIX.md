# Daily Challenge — real previous-day headlines

## Changes
- The Daily Challenge first tries the companion server endpoint `/api/daily-news`.
- If the game is hosted as a static Vatar build without that endpoint, it tries Google News RSS through an RSS-to-JSON bridge, searching Nigeria first and world news second.
- Every live-feed item must have a real URL and a publication date matching yesterday in the player's local calendar. It does not intentionally display a current-day or undated item as yesterday's news.
- The companion server now calculates yesterday in `Africa/Lagos` even when deployed in a UTC environment, and checks both Nigeria and world-news feeds as well as Punch feeds.
- A Reuters headline dated October 13, 2026 is included as a dated fallback for the October 14, 2026 Daily Challenge only. It is source-linked and is not reused on later dates.

## Important deployment note
The October 14 dated fallback will work when the updated `app.js` is uploaded. Future days require either the companion server to be deployed with outbound feed access or the browser's RSS-to-JSON bridge requests to succeed. The bridge is an external dependency and may be rate-limited or unavailable, so live feed delivery should be tested in the actual Vatar sandbox.

## Validation
- `node --check app.js`: passed
- `node --check server/server.js`: passed
- `node test-server.mjs`: all 10 tests passed
