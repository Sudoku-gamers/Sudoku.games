# Sudoku.games — Lagos Life-ready build

A browser-based Sudoku game with Cell Capture multiplayer, Competitive Solve-Off, solo puzzles, Daily Challenge, Technique Dojo, and Endless Story Mode.

## Modes

- **Cell Capture:** both players compete on one shared board and score correct cells.
- **Competitive Solve-Off:** each player solves their own copy of the same match puzzle; first correct completion wins. Match setup shares the selected mode, difficulty, variant, and 1–20 minute clock through the companion server. Wrong entries are rejected without a time penalty.
- **Endless Story Mode:** solo level map, sequential unlocking, increasing difficulty, star ratings, and locally saved progress.
- Existing Solo Sudoku, Daily Challenge, and Technique Dojo are retained.

## Run locally

Standalone browser/PWA mode can be served from any static host. For Lagos Life SDK integration, use Node.js 18+:

```sh
cd server
cp .env.example .env
# Set VATAR_SECRET to a Lagos Life sandbox secret in .env
node server.js
```

The server serves the app with the required `frame-ancestors` CSP header, verifies Vatar sessions for friendly match relays, and verifies purchase ownership before delivery. Set `VATAR_STORE_PATH` to persistent storage in production.

## Important production limitation

Lagos Life matches are created with `stake: 0`. The companion server's match configuration and move relay are in-memory and intended for a single test instance. Competitive Solve-Off's completion event is a friendly-mode notification, not an authoritative server-verified Sudoku result. **Do not enable stakes or advertise staked play.** Before launch with stakes, move puzzle generation and Sudoku validation server-side, use durable transactional storage, and implement/test the official signed result endpoint with `VATAR_RESULTS_SECRET` and the exact documented HMAC-SHA256 signing rules. Obtain platform approval first.
