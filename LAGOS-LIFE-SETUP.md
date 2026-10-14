# Lagos Life / Vatar adaptation

This branch targets the official Vatar Games SDK v1 documented at https://lagoslife.app/developers/docs.

## Included

- Official SDK URL: `https://lagoslife.app/sdk/vatar-games-v1.js`.
- Uses documented `window.Vatar` API names: `init`, `session`, `submitScore`, `purchases`, `onPurchase`, `purchase`, `onPause`, `onResume`, and `Vatar.match.create/join/quick/current/onUpdate`.
- Lagos Life native match controls (quick match, create room, join six-character code), while keeping the existing Supabase/guest flow when the game is opened outside Lagos Life.
- Only zero-stake matches are requested from the browser. Cell Capture remains the shared-board race; Competitive Solve-Off uses separate local boards with a shared first-writer-wins match configuration (mode, difficulty, variant and 1–20 minute clock).
- Required product IDs for the developer dashboard: `hints-3` and `continue-solo`.
- A Node 18+ companion server that serves the game with the required HTTP `Content-Security-Policy: frame-ancestors ...` response header and verifies purchase ownership with Vatar before marking a purchase delivered.

## Run locally

```sh
cd server
cp .env.example .env
# Edit .env and set VATAR_SECRET to your sandbox test secret.
set -a; . ./.env; set +a
node server.js
```

The server uses Node built-ins only. In production, set `VATAR_SECRET` as a hosting environment secret, use HTTPS, and mount `VATAR_STORE_PATH` on persistent storage. Do not commit `.env`, the real secret, or the generated `vatar-store.json`.

## Dashboard setup

1. Create a draft and obtain sandbox keys in the Lagos Life developer dashboard.
2. Deploy this project on an HTTPS hostname. The included Node server adds the required `frame-ancestors` header; if using another static host, configure that exact response header in the host settings. Do not use `X-Frame-Options: DENY` or `SAMEORIGIN`.
3. Set the draft's game URL to the deployed HTTPS URL and open it in the official sandbox.
4. Create products using the exact IDs above. Prices and sale status are configured in the dashboard, never in client code.
5. Verify identity, leaderboard, purchase test flow, mobile layout, icon, screenshots, category and description in the dashboard checklist.

## Important limitations before public launch

The SDK's native match API provides matchmaking and match lifecycle, not arbitrary game events. This project adds authenticated match-config and move/completion relay endpoints to the companion server and seeds both clients' puzzle generation from the match ID. Match configuration and relay events are in-memory and intended for a single test instance. The relay checks Vatar session identity and match membership, but it does **not** independently validate the Sudoku solution or determine the winner. **Signed match-result settlement is not implemented**, so paid stakes must remain disabled. Before any staked match or public competitive-result claim, move puzzle generation/solution and move validation server-side, make move storage durable, implement the documented HMAC-SHA256 result signing with `VATAR_RESULTS_SECRET`, and test the complete result path in sandbox. Local pass-and-play and standalone Supabase modes are retained.

Endless Story Mode is a solo progression map with locally saved unlocks and stars; Solo Sudoku, Daily Challenge, and Technique Dojo remain available.

The purchase endpoint verifies the signed Vatar session, fetches the purchase from Vatar, checks ownership/status/product allowlist, and marks it delivered. The included JSON store is intended for a single Node instance with persistent disk; use a transactional database/unique purchase ID constraint before horizontal scaling.


## Challenge setup in this build

The Lagos Life match panel lets players choose Cell Capture or Competitive Solve-Off and a 1–20 minute clock, create a zero-stake challenge, and share the six-character invite code. An opponent joins using that code. The stake control is intentionally locked to friendly/no-stake matches. Do not enable stakes until the reviewed build has authoritative server-side puzzle/move validation and signed result settlement, and Lagos Life has approved staked play. The selected mode/clock are shared through the existing `/api/vatar/solveoff/config` endpoint when the match starts; confirm that endpoint is deployed and configured on the production server.


## Sudoku hint and continue products

**Required dashboard setup — the client code cannot create or publish store products.** The screenshots showing `not_for_sale` mean the SDK received the request but the product is not enabled for sale in the Lagos Life developer dashboard. This cannot be fixed by changing client code; enable the exact product under the correct game draft. The build now hides the optional `theme-gold` purchase button and accepts only the two intended products (`hints-3`, `continue-solo`) so it does not send accidental requests for unconfigured extras.

Create/enable these exact product IDs under this game's draft, and set the listed sandbox/production prices as appropriate:
- `hints-3` — **₦100**, grants three additional hints; can be purchased up to 3 times per game.
- `continue-solo` — **₦200**, up to 2 continuations per game, lets a player continue the same Solo/Story puzzle after the fourth mistake.

Optional products `hints-20` and `theme-gold` are disabled and excluded from the purchase allowlist in this build. Do not expose or enable them unless their grant logic, dashboard products, and server allowlist are deliberately reintroduced together.

Each solo/story puzzle starts with **2 free hints**. After the fourth incorrect entry, the puzzle ends and offers `continue-solo`. Only a verified and delivered purchase should grant the benefit. Once products are enabled, make a sandbox purchase of each product and confirm the dashboard checklist records purchase, server verification and delivery before publishing them.
