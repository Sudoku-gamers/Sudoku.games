/**
 * Sudoku.games — Lagos Life / Vatar companion server
 * Node.js 18+; built-in modules only.
 *
 * Required environment:
 *   VATAR_SECRET=vtr_test_... (sandbox) or vtr_live_... (approved production)
 *   PORT=8080 (optional)
 *
 * Keep VATAR_SECRET out of all browser files. Do not enable staked matches until
 * an authoritative Sudoku generator/move validator and signed result submission
 * have been deployed; this starter intentionally supports zero-stake friendlies only.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Node does not read .env files by itself, so load server/.env here (values already set in the environment win).
try {
  const envText = await fs.readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'), 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch (e) { if (e.code !== 'ENOENT') console.warn('[env] could not read .env:', e.message); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://lagoslife.app/api/games/v1';
const SECRET = process.env.VATAR_SECRET;
const PORT = Number(process.env.PORT || 8080);
const DB_PATH = process.env.VATAR_STORE_PATH || path.join(path.dirname(fileURLToPath(import.meta.url)), 'vatar-store.json');
// Least-privilege allowlist: only products enabled for this build.
const PRODUCTS = new Set(['hints-5', 'continue-solo']);
const liveMoves = new Map();
const sessionCache = new Map();
const matchCache = new Map();
const matchConfigs = new Map();
// Public lobby metadata; private Vatar room codes stay server-side. In-memory by design.
const publicChallenges = new Map();
const MAX_BODY = 64 * 1024;

if (!SECRET) console.warn('[Vatar] VATAR_SECRET is not set. Purchase verification will return 503.');

async function readStore() {
  try { return JSON.parse(await fs.readFile(DB_PATH, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return { purchases: {} }; throw e; }
}
async function writeStore(store) {
  const temp = DB_PATH + '.tmp';
  await fs.writeFile(temp, JSON.stringify(store, null, 2), { mode: 0o600 });
  await fs.rename(temp, DB_PATH);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('body_too_large'), { status: 413 })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(Object.assign(new Error('invalid_json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
async function verifiedPlayer(session) {
  const key = crypto.createHash('sha256').update(session).digest('hex');
  const cached = sessionCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.player;
  const player = await vatarApi('/session/verify', { session });
  if (player.http !== 200 || !player.playerId) return null;
  sessionCache.set(key, { player, expiresAt: Date.now() + 30_000 });
  return player;
}
async function verifiedMatch(matchId) {
  const cached = matchCache.get(matchId);
  if (cached && cached.expiresAt > Date.now()) return cached.match;
  const match = await vatarApi(`/matches/${encodeURIComponent(matchId)}`);
  if (match.http !== 200 || !match.id) return null;
  matchCache.set(matchId, { match, expiresAt: Date.now() + 5_000 });
  return match;
}
async function vatarApi(route, body) {
  if (!SECRET) return { http: 503, error: 'server_not_configured' };
  const response = await fetch(API + route, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  let data = {};
  try { data = await response.json(); } catch {}
  return { http: response.status, ...data };
}
function send(res, status, data, extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders });
  res.end(JSON.stringify(data));
}
function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return ({ '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json', '.txt':'text/plain; charset=utf-8' })[ext] || 'application/octet-stream';
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/api/daily-news' && req.method === 'GET') {
      // Try multiple public feeds, then select an item published on the previous
      // local calendar day. RSS is not a guaranteed API, so fail clearly if all fail.
      // Daily Challenge follows Nigeria's calendar day even if the server runs in UTC.
      const dateInLagos = (value) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
      const now = new Date();
      const lagosParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).reduce((out, part) => (out[part.type] = part.value, out), {});
      const yesterdayDate = new Date(Date.UTC(Number(lagosParts.year), Number(lagosParts.month) - 1, Number(lagosParts.day) - 1, 12));
      const day = dateInLagos(yesterdayDate);
      const feeds = [
        'https://news.google.com/rss/search?q=' + encodeURIComponent('Nigeria when:2d') + '&hl=en-NG&gl=NG&ceid=NG:en',
        'https://news.google.com/rss/search?q=' + encodeURIComponent('world news when:2d') + '&hl=en&gl=US&ceid=US:en',
        'https://rss.punchng.com/v1/punch/metro',
        'https://rss.punchng.com/v1/punch/news'
      ];
      const decode = (value) => String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
      for (const rssUrl of feeds) {
        try {
          const feedResponse = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SudokuLife/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(6500) });
          if (!feedResponse.ok) continue;
          const xml = await feedResponse.text();
          const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(m => m[1]);
          const candidates = items.map(item => {
            const field = (name) => decode(item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || '');
            const title = field('title');
            const articleUrl = field('link') || decode(item.match(/<link\b[^>]*href=["']([^"']+)/i)?.[1] || '');
            const published = field('pubDate') || field('published') || field('updated');
            const parsedDate = published ? new Date(published) : null;
            const source = decode(item.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || new URL(rssUrl).hostname.replace(/^www\./,''));
            return { title, url: articleUrl, published, parsedDate, source, description: field('description').replace(/<[^>]+>/g,' ').slice(0,500) };
          }).filter(x => x.title && /^https?:\/\//i.test(x.url) && x.parsedDate && !Number.isNaN(x.parsedDate.getTime()));
          const matching = candidates.filter(x => dateInLagos(x.parsedDate) === day)
            .sort((a,b) => b.parsedDate - a.parsedDate);
          if (matching.length) {
            const chosen = matching[0];
            return send(res, 200, { date: day, title: chosen.title, description: chosen.description, url: chosen.url, source: chosen.source, publishedAt: chosen.parsedDate.toISOString() });
          }
        } catch (_) { /* try next feed */ }
      }
      return send(res, 502, { error: 'news_feed_unavailable', date: day, message: 'No trusted news feed returned a headline dated yesterday.' });
    }
    if (url.pathname === '/api/vatar/challenges' && req.method === 'GET') {
      const now = Date.now();
      for (const [id, item] of publicChallenges) {
        if (item.expiresAt <= now) publicChallenges.delete(id);
        else if (item.status === 'joining' && now - (item.joiningAt || 0) > 30000) item.status = 'open'; // join never finished: reopen
      }
      return send(res, 200, { challenges: [...publicChallenges.values()].filter(x => x.status === 'open').map(({ id, mode, timeLimit, stake, createdAt }) => ({ id, mode, timeLimit, stake, createdAt })) });
    }
    if (url.pathname === '/api/vatar/challenges' && req.method === 'POST') {
      const payload = await readBody(req);
      const { session, matchId, code } = payload;
      if (typeof session !== 'string' || typeof matchId !== 'string' || typeof code !== 'string' || !/^[A-Z0-9]{6}$/.test(code)) return send(res, 400, { error: 'invalid_request' });
      const player = await verifiedPlayer(session);
      if (!player) return send(res, 403, { error: 'invalid_session' });
      const match = await verifiedMatch(matchId);
      if (!match || match.status !== 'open' || !Array.isArray(match.players) || !match.players.some(p => p.playerId === player.playerId)) return send(res, 403, { error: 'not_open_match_creator' });
      const requested = payload.config && typeof payload.config === 'object' ? payload.config : {};
      const id = crypto.randomUUID();
      publicChallenges.set(id, { id, matchId, code, creatorId: player.playerId, mode: requested.mode === 'solveoff' ? 'solveoff' : 'simultaneous', timeLimit: Math.max(60, Math.min(1200, Number(requested.timeLimit) || 600)), stake: 0, status: 'open', createdAt: Date.now(), expiresAt: Date.now() + 15 * 60 * 1000 });
      return send(res, 201, { id });
    }
    if (url.pathname.startsWith('/api/vatar/challenges/') && req.method === 'POST' && url.pathname.endsWith('/join')) {
      const payload = await readBody(req);
      if (typeof payload.session !== 'string') return send(res, 400, { error: 'invalid_request' });
      const player = await verifiedPlayer(payload.session);
      if (!player) return send(res, 403, { error: 'invalid_session' });
      const id = url.pathname.split('/')[4];
      const challenge = publicChallenges.get(id);
      if (challenge && challenge.status === 'joining' && Date.now() - (challenge.joiningAt || 0) > 30000) challenge.status = 'open';
      if (!challenge || challenge.status !== 'open' || challenge.expiresAt <= Date.now()) return send(res, 404, { error: 'challenge_unavailable' });
      if (challenge.creatorId === player.playerId) return send(res, 409, { error: 'cannot_join_own_challenge' });
      const match = await verifiedMatch(challenge.matchId);
      if (!match || match.status !== 'open') { publicChallenges.delete(id); return send(res, 409, { error: 'challenge_unavailable' }); }
      challenge.status = 'joining';
      challenge.joiningAt = Date.now();
      return send(res, 200, { code: challenge.code, config: { mode: challenge.mode, timeLimit: challenge.timeLimit } });
    }

    if (req.method === 'POST' && url.pathname === '/api/vatar/solveoff/config') {
      const payload = await readBody(req);
      const { session, matchId } = payload;
      if (typeof session !== 'string' || typeof matchId !== 'string' || matchId.length > 128) return send(res, 400, { error: 'invalid_request' });
      const player = await verifiedPlayer(session);
      if (!player) return send(res, 403, { error: 'invalid_session' });
      const match = await verifiedMatch(matchId);
      if (!match || match.status !== 'playing' || !Array.isArray(match.players) || !match.players.some(p => p.playerId === player.playerId)) return send(res, 403, { error: 'not_active_match_member' });
      if (!matchConfigs.has(matchId)) {
        const requested = payload.config && typeof payload.config === 'object' ? payload.config : {};
        const timeLimit = Number(requested.timeLimit);
        const difficulty = ['easy', 'medium', 'hard', 'extreme'].includes(requested.difficulty) ? requested.difficulty : 'medium';
        const variant = ['classic', 'killer', 'diagonal', 'jigsaw', 'thermo', 'consecutive', 'arrow', 'evenodd', 'windoku', 'antiknight'].includes(requested.variant) ? requested.variant : 'classic';
        matchConfigs.set(matchId, {
          mode: requested.mode === 'solveoff' ? 'solveoff' : 'simultaneous',
          timeLimit: Number.isFinite(timeLimit) ? Math.max(60, Math.min(1200, Math.round(timeLimit / 60) * 60)) : 600,
          difficulty, variant, configuredAt: Date.now()
        });
      }
      return send(res, 200, { config: matchConfigs.get(matchId) });
    }

    if ((req.method === 'POST' && (url.pathname === '/api/vatar/move' || url.pathname === '/api/vatar/moves')) ||
        (req.method === 'GET' && url.pathname === '/api/vatar/moves')) {
      let session, matchId, row, col, value, type, after = 0;
      if (req.method === 'POST') {
        const payload = await readBody(req);
        ({ session, matchId } = payload);
        if (url.pathname === '/api/vatar/move') ({ row, col, value, type } = payload);
        else after = Number(payload.after || 0);
      } else {
        session = url.searchParams.get('session');
        matchId = url.searchParams.get('matchId');
        after = Number(url.searchParams.get('after') || 0);
      }
      if (typeof session !== 'string' || typeof matchId !== 'string' || matchId.length > 128) return send(res, 400, { error: 'invalid_request' });
      const player = await verifiedPlayer(session);
      if (!player) return send(res, 403, { error: 'invalid_session' });
      const match = await verifiedMatch(matchId);
      if (!match || match.status !== 'playing' || !Array.isArray(match.players) || !match.players.some(p => p.playerId === player.playerId)) {
        return send(res, 403, { error: 'not_active_match_member' });
      }
      if (req.method === 'POST' && url.pathname === '/api/vatar/move') {
        if (type === 'solved') {
          // Friendly-mode notification only. This is not an authoritative Sudoku verification.
          if (!matchConfigs.has(matchId) || matchConfigs.get(matchId).mode !== 'solveoff') return send(res, 409, { error: 'solveoff_not_configured' });
        } else if (![row, col, value].every(Number.isInteger) || row < 0 || row > 8 || col < 0 || col > 8 || value < 1 || value > 9) {
          return send(res, 400, { error: 'invalid_move' });
        }
        let list = liveMoves.get(matchId);
        if (!list) { list = []; liveMoves.set(matchId, list); }
        if (list.length > 1000) list.splice(0, list.length - 800);
        const event = { seq: (list[list.length - 1]?.seq || 0) + 1, playerId: player.playerId, ...(type === 'solved' ? { type: 'solved' } : { type: 'move', row, col, value }), at: Date.now() };
        list.push(event);
        return send(res, 201, { accepted: true, seq: event.seq });
      }
      const moves = (liveMoves.get(matchId) || []).filter(move => move.seq > Math.max(0, after));
      return send(res, 200, { moves });
    }

    if (req.method === 'POST' && url.pathname === '/api/vatar/claim') {
      const { session, purchaseId } = await readBody(req);
      if (typeof session !== 'string' || typeof purchaseId !== 'string' || purchaseId.length > 128) {
        return send(res, 400, { error: 'invalid_request' });
      }
      const player = await vatarApi('/session/verify', { session });
      if (player.http !== 200 || !player.playerId) return send(res, 403, { error: 'invalid_session' });
      const purchase = await vatarApi(`/purchases/${encodeURIComponent(purchaseId)}`);
      if (purchase.http !== 200 || purchase.playerId !== player.playerId) return send(res, 403, { error: 'purchase_not_owned' });
      if (purchase.status === 'refunded') return send(res, 409, { error: 'refunded' });
      if (!PRODUCTS.has(purchase.productId)) return send(res, 400, { error: 'unknown_product' });

      const store = await readStore();
      const existing = store.purchases[purchase.id];
      if (existing && (existing.playerId !== player.playerId || existing.productId !== purchase.productId)) {
        return send(res, 409, { error: 'purchase_conflict' });
      }
      if (!existing) {
        // Record before marking delivered; repeat calls are idempotent by purchase ID.
        store.purchases[purchase.id] = {
          playerId: player.playerId, productId: purchase.productId,
          createdAt: new Date().toISOString(), delivered: false, grantIssued: false
        };
        await writeStore(store);
      }
      const shouldGrant = !store.purchases[purchase.id].grantIssued;
      const deliver = await vatarApi(`/purchases/${encodeURIComponent(purchase.id)}/deliver`, {});
      if (deliver.http !== 200 || !['delivered'].includes(deliver.status)) {
        return send(res, 502, { error: 'delivery_pending' });
      }
      store.purchases[purchase.id].delivered = true;
      store.purchases[purchase.id].deliveredAt ||= new Date().toISOString();
      store.purchases[purchase.id].grantIssued = true;
      await writeStore(store);
      return send(res, 200, { delivered: true, grant: shouldGrant, productId: purchase.productId });
    }

    if (req.method === 'GET' && url.pathname === '/healthz') return send(res, 200, { ok: true, service: 'sudoku-vatar' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 404, { error: 'not_found' });

    // Static hosting for the game. frame-ancestors is an HTTP header, not a meta tag.
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const file = path.resolve(ROOT, '.' + pathname);
    if (!file.startsWith(ROOT + path.sep)) return send(res, 403, { error: 'forbidden' });
    // Public allowlist: never serve server code, .env, stores, SQL or docs.
    const rel = path.relative(ROOT, file).split(path.sep);
    const publicExt = /\.(html|js|css|json|png|jpg|jpeg|svg|webp|ico|webmanifest)$/i;
    if (rel[0] === 'server' || rel.some(part => part.startsWith('.')) || !publicExt.test(file) || path.basename(file) === 'package.json') {
      return send(res, 404, { error: 'not_found' });
    }
    let stat;
    try { stat = await fs.stat(file); } catch { return send(res, 404, { error: 'not_found' }); }
    if (!stat.isFile()) return send(res, 404, { error: 'not_found' });
    const headers = {
      'Content-Type': mime(file),
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "frame-ancestors https://lagoslife.app https://www.lagoslife.app https://naijalife.app https://www.naijalife.app https://lagoslife.eliysites.com",
      'Cache-Control': /\.(html|js|css)$/.test(file) ? 'no-cache' : 'public, max-age=86400'
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    res.end(await fs.readFile(file));
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) send(res, err.status || 500, { error: err.message || 'server_error' });
    else res.end();
  }
});
server.listen(PORT, () => console.log(`Sudoku.games listening on :${PORT}`));
