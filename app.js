        [...]
        450|                 const statCard = (icon, label, value, color) => `
        [...]
        458|                     </div>`;
        [...]
        2302|         function markGridDirty() { _gridDirty = true; }
        [...]
        2363|             const formatTime = (s) => {
        [...]
        2386|                 if (t2 !== _lastTimerStr.p2) { p2El.textContent = t2; _lastTimerStr.p2 = t2; }
        [...]
        2395|             const fmt = n => n.toLocaleString();
        [...]
        3151|             const close = () => overlay.remove();
        [...]
        4002|                     req.onsuccess = () => resolve(req.result || null);
        4003|                     req.onerror  = () => resolve(null);
        [...]
        4016|                 req.onupgradeneeded = e => e.target.result.createObjectStore('creds', { keyPath: 'id' });
        4017|                 req.onsuccess = e => resolve(e.target.result);
        4018|                 req.onerror   = e => reject(e.target.error);
        [...]
        4039|                         lock: async (name, acquireTimeout, fn) => fn(), // bypass LockManager
        [...]
        4039|         async function connectSupabase() {
        4040|             if (!SUPABASE_URL || !SUPABASE_KEY) {
        4041|                 console.error('Supabase credentials missing');
        4042|                 return null;
        4043|             }
        [...]
        4213|         window.openTournamentDetail = function(tid) { openTournamentDetail(tid); };
        [...]
        5340|         function handleRoomUpdate(remoteState) {
        5341|             // Host: detect when guest joins and start game
        5342|             if (onlineState.isHost && remoteState.status === 'playing' && !gameState.isRunning) {
        5343|                 if (onlineState._pollInterval) { clearInterval(onlineState._pollInterval); onlineState._pollInterval = null; }
        [...]
        5791|         async function handleAuthSubmit() {
        [...]
        5797|             if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
        [...]
        6114|                     btn.onclick = async () => { 
        6114a|                         await sendFriendRequest(userId, p.username); 
        6114b|                         btn.textContent = '✓ Sent'; 
        6114c|                         btn.disabled = true; 
        6114d|                     };
        6115|                 } else if (friendship.status === 'accepted') {
        6116|                     btn.className = 'action-btn btn-primary'; btn.textContent = '⚔ Challenge';
        6117|                     btn.onclick = () => { modal.classList.remove('active'); challengeFriend(p); };
        [...]
        6165|                     { label: '⚔ Challenge', cls: 'challenge', action: () => challengeFriend(other) },
        6166|                     { label: 'Remove', cls: 'danger', action: () => removeFriend(f.id) },
        [...]
        6187|                     { label: '✓ Accept', cls: 'accept', action: () => acceptFriend(f.id) },
        6188|                     { label: 'Decline', cls: 'danger', action: () => removeFriend(f.id) },
        [...]
        6215|                     { label: '+ Add', cls: '', action: () => sendFriendRequest(p.id, p.username) },
        [...]
