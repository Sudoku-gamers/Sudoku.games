// Test preload: replaces global fetch for https://lagoslife.app/api/games/v1/* with a mock of the contract
// documented at lagoslife.app/developers/docs (session verify, GET match, signed POST result).
// It recomputes the documented HMAC itself, so a pass proves the server's signing matches the docs.
// Uses dummy secrets only. It does NOT prove what the live Lagos Life service does.
import crypto from 'node:crypto';
const realFetch = globalThis.fetch;
const SECRET = process.env.VATAR_SECRET, RSECRET = process.env.VATAR_RESULTS_SECRET;
const sessions = { 'sess-alice': 'p_alice', 'sess-bob': 'p_bob', 'sess-eve': 'p_eve' };
const two = [{ playerId: 'p_alice', name: 'Alice' }, { playerId: 'p_bob', name: 'Bob' }];
export const state = {
  matches: {
    m_play:  { id: 'm_play',  status: 'playing', nonce: 'nonce_play',  players: [{ playerId: 'p_alice', name: 'Alice' }, { playerId: 'p_bob', name: 'Bob' }] },
    m_open:  { id: 'm_open',  status: 'open',    nonce: 'nonce_open',  players: [{ playerId: 'p_alice', name: 'Alice' }] },
    m_done:  { id: 'm_done',  status: 'done',    nonce: 'nonce_done',  players: [{ playerId: 'p_alice', name: 'Alice' }, { playerId: 'p_bob', name: 'Bob' }], winner: 'p_bob' },
    m_done_won:{ id: 'm_done_won', status: 'done', nonce: 'nonce_dw', players: two, winner: 'p_alice' }, // alice already WON
    m_nonce: { id: 'm_nonce', status: 'playing',                        players: [{ playerId: 'p_alice', name: 'Alice' }, { playerId: 'p_bob', name: 'Bob' }] },
    m_down:  { id: 'm_down',  status: 'playing', nonce: 'nonce_down',  players: two },     // result POST: network failure
    m_500:   { id: 'm_500',   status: 'playing', nonce: 'nonce_500',   players: two },     // GET match: HTTP 500
    m_badsig:{ id: 'm_badsig',status: 'playing', nonce: 'nonce_wrong',  players: two },    // GET returns a nonce the signer cannot match
    m_conflict:{ id: 'm_conflict', status: 'playing', nonce: 'nonce_conflict', players: two }, // POST: 409 already_settled
    m_race:  { id: 'm_race',  status: 'playing', nonce: 'nonce_race',  players: two },     // POST: 409 not_playing
  }
};
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  if (u.origin !== 'https://lagoslife.app') return realFetch(url, init);
  const h = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  if (h.authorization !== `Bearer ${SECRET}`) return json(401, { error: 'bad_secret' });
  const route = u.pathname.replace('/api/games/v1', '');
  const method = init.method || 'GET';
  if (route === '/session/verify' && method === 'POST') {
    const { session } = JSON.parse(init.body);
    if (session === 'sess-down') throw new TypeError('fetch failed');
    return sessions[session] ? json(200, { playerId: sessions[session], name: sessions[session], gameId: 'g1', exp: 9999999999, mode: 'test' }) : json(401, { error: 'bad_session' });
  }
  let m = route.match(/^\/matches\/([^/]+)$/);
  if (m && method === 'GET') {
    const id = decodeURIComponent(m[1]);
    if (id === 'm_500') return json(500, { error: 'error' });
    const match = state.matches[id];
    return match ? json(200, match) : json(404, { error: 'not_found' });
  }
  m = route.match(/^\/matches\/([^/]+)\/result$/);
  if (m && method === 'POST') {
    const id = decodeURIComponent(m[1]);
    if (id === 'm_down') throw new TypeError('fetch failed');      // simulates network failure
    const match = state.matches[id];
    if (!match) return json(404, { error: 'not_found' });
    const ts = h['x-vatar-timestamp'];
    if (!ts || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return json(401, { error: 'stale_timestamp' });
    const realNonce = id === 'm_badsig' ? 'nonce_real' : match.nonce;
    const sha = crypto.createHash('sha256').update(init.body).digest('hex');
    const want = 'v1=' + crypto.createHmac('sha256', RSECRET).update(['POST', u.pathname, ts, realNonce, sha].join('\n')).digest('hex');
    if (h['x-vatar-signature'] !== want) return json(401, { error: 'bad_signature' });
    const { winner } = JSON.parse(init.body);
    if (id === 'm_conflict') return json(409, { error: 'already_settled' });
    if (id === 'm_race') return json(409, { error: 'not_playing' });
    if (match.status === 'done') return match.winner === winner ? json(200, match) : json(409, { error: 'already_settled' });
    if (match.status !== 'playing') return json(409, { error: 'not_playing' });
    if (winner !== 'draw' && !match.players.some(p => p.playerId === winner)) return json(400, { error: 'bad_request' });
    match.status = 'done'; match.winner = winner;
    return json(200, match);
  }
  return json(404, { error: 'not_found' });
};
