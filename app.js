        /**
         * SUDOKU.GAME - Lichess-style Competitive PvP Sudoku
         */

        // ============================================
        // CONFIGURATION
        // ============================================
        const CONFIG = {
            GRID_SIZE: 9,
            BOX_SIZE: 3,
            
            // Board colors (chess-inspired)
            CELL_LIGHT: '#f0d9b5',
            CELL_DARK: '#b58863',
            CELL_PREFILLED: '#a89f91',
            
            // Player colors
            COLOR_P1: '#4a9eff',
            COLOR_P2: '#ff8c4a',
            COLOR_P1_TINT: 'rgba(74, 158, 255, 0.5)',
            COLOR_P2_TINT: 'rgba(255, 140, 74, 0.5)',
            
            // Highlight
            COLOR_SELECTED: 'rgba(130, 200, 60, 0.6)',
            COLOR_HIGHLIGHT: 'rgba(255, 255, 255, 0.15)',
            COLOR_LAST_MOVE: 'rgba(255, 215, 0, 0.4)',  // Gold highlight for opponent's last move
            
            // Animation
            CLAIM_ANIMATION_DURATION: 300,
            POP_SCALE: 1.2,
            
            // Board Themes
            THEMES: {
                classic: {
                    light: '#f0d9b5',
                    dark: '#b58863',
                    prefilled: '#a89f91',
                    name: 'Classic Chess'
                },
                wood: {
                    light: '#deb887',
                    dark: '#8b4513',
                    prefilled: '#a0826d',
                    name: 'Wooden'
                },
                marble: {
                    light: '#e8e8e8',
                    dark: '#969696',
                    prefilled: '#b8b8b8',
                    name: 'Marble'
                },
                neon: {
                    light: '#2d2d2d',
                    dark: '#1a1a1a',
                    prefilled: '#404040',
                    name: 'Neon'
                },
                ocean: {
                    light: '#87ceeb',
                    dark: '#4682b4',
                    prefilled: '#6495ed',
                    name: 'Ocean'
                },
                sunset: {
                    light: '#ffb366',
                    dark: '#ff8533',
                    prefilled: '#cc6600',
                    name: 'Sunset'
                },
                // ─── Modern clean themes ──────────────────────────
                clean: {
                    light: '#ffffff',
                    dark: '#f0f2f8',
                    prefilled: '#e8eaf6',
                    prefilledText: '#1a237e',
                    playerText: '#1565c0',
                    lineColor: '#bdc1d4',
                    boldLineColor: '#37474f',
                    outerBorderColor: '#212121',
                    bgFill: '#ffffff',
                    checkerboard: false,
                    name: 'Clean'
                },
                night: {
                    light: '#1e2139',
                    dark: '#161830',
                    prefilled: '#252844',
                    prefilledText: '#e8eaf6',
                    playerText: '#64b5f6',
                    lineColor: '#2d3060',
                    boldLineColor: '#5c6bc0',
                    outerBorderColor: '#7986cb',
                    bgFill: '#161830',
                    checkerboard: false,
                    name: 'Night'
                }
            },
            
            // AI difficulty settings (base delays, will be scaled by time control)
            AI_DIFFICULTY: {
                easy: {
                    baseMinDelay: 0.08,  // 8% of remaining time per move minimum
                    baseMaxDelay: 0.15,  // 15% of remaining time per move maximum
                    mistakeChance: 0.35,  // 35% chance of making a mistake
                    obviousMovePriority: 0.4,  // 40% chance to find obvious moves
                    rating: 1.5,
                    name: 'Easy Bot'
                },
                medium: {
                    baseMinDelay: 0.05,  // 5% of remaining time per move minimum
                    baseMaxDelay: 0.10,  // 10% of remaining time per move maximum
                    mistakeChance: 0.15,  // 15% chance of making a mistake
                    obviousMovePriority: 0.7,  // 70% chance to find obvious moves
                    rating: 2.5,
                    name: 'Medium Bot'
                },
                hard: {
                    baseMinDelay: 0.03,  // 3% of remaining time per move minimum
                    baseMaxDelay: 0.07,  // 7% of remaining time per move maximum
                    mistakeChance: 0.02,  // 2% chance of making a mistake
                    obviousMovePriority: 0.95,  // 95% chance to find obvious moves
                    rating: 4.0,
                    name: 'Hard Bot'
                }
            },
            
            // Rating
            STARTING_RATING: 2.0,
            MAX_RATING: 6.0,
            MIN_RATING: 0.0
        };

        // ============================================
        // GAME STATE
        // ============================================
        let gameState = {
            solution: [],
            puzzle: [],
            claims: [],
            pencilMarks: [],  // Track pencil marks for each cell
            
            variant: 'classic',  // 'classic' | 'diagonal' | 'windoku' | 'antiknight'
            gridSize: 9,         // 9 for standard, 16 for 16x16
            boxSize: 3,          // 3 for 9x9, 4 for 16x16
            timeLimit: 600,
            gameMode: 'simultaneous',
            vsAI: false,
            aiDifficulty: 'medium',
            difficulty: 'medium',
            
            timeRemaining: 600,
            p1Time: 600,
            p2Time: 600,
            
            isRunning: false,
            isPaused: false,
            currentPlayer: 1,
            scores: { p1: 0, p2: 0 },
            selectedCell: null,
            lastMoveCell: null,  // Track opponent's last move
            inputMode: 'pen',  // 'pen' or 'pencil'
            animatingCells: new Map(),
            lastTick: 0,
            wrongMoves: 0,          // penalty counter (resets after 3)
            totalWrongMoves: 0,     // cumulative total mistakes this game
            maxWrongMoves: 3,       // 3 strikes
            errorCell: null,        // { row, col, startTime } for red flash
            highlightNumber: null,  // number to highlight across the board
            hintsUsed: 0,           // count hints used this game
            floatingScores: [],     // [{x, y, text, startTime, color}] DOM animations
        };

        let playerRating = CONFIG.STARTING_RATING;
        let _activeLbTab = 'bullet'; // tracks which TC leaderboard tab is active
        let _lastCorrectMoveTime = 0;  // timestamp of last correct move (for speed bonus)

        // ============================================
        // PLAYER DATA & STORAGE
        // ============================================
        let playerData = {
            settings: {
                username: 'Player',
                soundEnabled: true,
                animationsEnabled: true,
                boardTheme: 'classic',
                colorBlind: false
            },
            profile: {
                rating: CONFIG.STARTING_RATING,
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                bestStreak: 0,
                currentStreak: 0,
                totalTimePlayed: 0
            },
            history: [],
            soloStats: { easy:{}, medium:{}, hard:{}, extreme:{}, daily:{} }
        };

        function loadPlayerData() {
            const saved = localStorage.getItem('sudoku_player_data');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // Deep merge so new default keys in settings/profile aren't wiped
                    // by an older save that's missing those fields.
                    playerData = {
                        ...playerData,
                        ...parsed,
                        settings:   { ...playerData.settings,   ...(parsed.settings   || {}) },
                        profile:    { ...playerData.profile,     ...(parsed.profile    || {}) },
                        soloStats:  { easy:{}, medium:{}, hard:{}, extreme:{}, daily:{}, ...playerData.soloStats, ...(parsed.soloStats  || {}) },
                    };
                    playerRating = playerData.profile.rating;
                } catch (e) {
                    console.error('Error loading player data:', e);
                }
            }
            updateAllDisplays();
        }

        function savePlayerData() {
            playerData.profile.rating = playerRating;
            localStorage.setItem('sudoku_player_data', JSON.stringify(playerData));
            debouncedUpdateAllDisplays();
        }

        // Debounced wrapper — coalesces rapid successive saves (e.g. rapid moves)
        // into a single DOM update 150 ms after the last call.
        let _updateDisplaysTimer = null;
        function debouncedUpdateAllDisplays() {
            clearTimeout(_updateDisplaysTimer);
            _updateDisplaysTimer = setTimeout(updateAllDisplays, 150);
        }

        function updateAllDisplays() {
            const username = currentProfile?.username || playerData.settings.username || 'Player';
            const gamesPlayed = currentProfile?.games_played ?? playerData.profile.gamesPlayed;
            const wins = currentProfile?.wins ?? playerData.profile.wins;
            const losses = currentProfile?.losses ?? playerData.profile.losses;
            const draws = currentProfile?.draws ?? playerData.profile.draws;
            const bestStreak = currentProfile?.best_streak ?? playerData.profile.bestStreak;
            const avatar = currentProfile?.avatar_emoji || username.charAt(0).toUpperCase();

            // Side menu shows active TC rating (default to bullet if no games)
            const tcRating = _activeLbTab === 'blitz'     ? (currentProfile?.blitz_rating     ?? 2.0)
                           : _activeLbTab === 'rapid'     ? (currentProfile?.rapid_rating     ?? 2.0)
                           : _activeLbTab === 'classical' ? (currentProfile?.classical_rating ?? 2.0)
                           :                               (currentProfile?.bullet_rating     ?? 2.0);
            document.getElementById('menu-rating').textContent = 'Rating: ' + tcRating.toFixed(1);

            // Game screen player bar uses bullet rating by default (updated at game start)
            const el = document.getElementById('p1-rating-display');
            if (el) el.textContent = 'Rating: ' + tcRating.toFixed(1);

            // user-rating element removed from lobby — guard in case old HTML still has it
            const ur = document.getElementById('user-rating');
            if (ur) ur.textContent = tcRating.toFixed(1);

            // Username displays
            document.getElementById('menu-username').textContent = username;
            document.getElementById('menu-avatar').textContent = avatar;
            document.getElementById('profile-username').textContent = username;
            const usernameInput = document.getElementById('username-input');
            if (usernameInput && document.activeElement !== usernameInput) {
                usernameInput.value = username;
            }

            // Profile stats
            document.getElementById('profile-games').textContent  = gamesPlayed;
            document.getElementById('profile-wins').textContent   = wins;
            document.getElementById('profile-losses').textContent = losses;
            document.getElementById('profile-draws').textContent  = draws;
            document.getElementById('profile-streak').textContent = bestStreak;

            // TC ratings on profile — show — if never played that TC
            const tcMap = {
                'tc-bullet':    'bullet_rating',
                'tc-blitz':     'blitz_rating',
                'tc-rapid':     'rapid_rating',
                'tc-classical': 'classical_rating',
            };
            Object.entries(tcMap).forEach(([elId, field]) => {
                const tcEl = document.getElementById(elId);
                if (!tcEl) return;
                const val = currentProfile?.[field];
                tcEl.textContent = val != null ? val.toFixed(1) : '—';
            });

            // Avatar
            renderOwnAvatar(currentProfile, username);
            const editLbl = document.getElementById('prof-avatar-edit-lbl');
            if (editLbl) editLbl.style.display = currentUser ? 'flex' : 'none';

            // Member since
            const sinceEl = document.getElementById('profile-since');
            if (sinceEl && currentProfile?.created_at) {
                const d = new Date(currentProfile.created_at);
                sinceEl.textContent = 'Member since ' + d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }

            // Puzzle XP
            renderPuzzleXP(currentProfile);

            // Solo stats section (only if profile is visible)
            if (document.getElementById('profile-page')?.classList.contains('active')) {
                renderSoloProfileStats();
            }

            // Badges
            updateBadges();

            // Settings
            updateToggle('sound-toggle', playerData.settings.soundEnabled);
            updateToggle('animations-toggle', playerData.settings.animationsEnabled);
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) themeSelect.value = playerData.settings.boardTheme || 'classic';
            updateToggle('colorblind-toggle', playerData.settings.colorBlind || false);
        }

        // Render own avatar (image or initials fallback)
        function renderOwnAvatar(profile, username) {
            const img  = document.getElementById('prof-avatar-img');
            const init = document.getElementById('prof-avatar-init');
            if (!img || !init) return;
            if (profile?.avatar_url) {
                img.src = profile.avatar_url; img.style.display = 'block'; init.style.display = 'none';
            } else {
                img.style.display = 'none';
                init.textContent = profile?.avatar_emoji || (username || 'P')[0].toUpperCase();
                init.style.display = 'flex';
            }
        }

        // Puzzle XP bar on own profile
        function renderPuzzleXP(profile) {
            const localProgress = JSON.parse(localStorage.getItem('sudoku_technique_progress') || '{}');
            const localXP = Object.values(localProgress).reduce((s, p) => s + (p.xp || 0), 0);
            const xp = Math.max(localXP, profile?.puzzle_xp || 0);
            const RANKS = [
                { name: 'Beginner',     emoji: '🌱', min: 0,   next: 25  },
                { name: 'Intermediate', emoji: '📈', min: 25,  next: 70  },
                { name: 'Advanced',     emoji: '🔥', min: 70,  next: 150 },
                { name: 'Expert',       emoji: '⭐', min: 150, next: 300 },
                { name: 'Grandmaster',  emoji: '🏆', min: 300, next: 300 },
            ];
            const rank = RANKS.slice().reverse().find(r => xp >= r.min) || RANKS[0];
            const pct  = rank.name === 'Grandmaster' ? 100
                       : Math.min(100, Math.round(((xp - rank.min) / (rank.next - rank.min)) * 100));
            const rankEl = document.getElementById('prof-puzzle-rank');
            const barEl  = document.getElementById('prof-puzzle-bar');
            const xpEl   = document.getElementById('prof-puzzle-xp');
            if (rankEl) rankEl.textContent = rank.emoji + ' ' + rank.name;
            if (barEl)  barEl.style.width  = pct + '%';
            if (xpEl)   xpEl.textContent   = xp;
        }

        function updateToggle(id, active) {
            const toggle = document.getElementById(id);
            if (toggle) {
                if (active) {
                    toggle.classList.add('active');
                } else {
                    toggle.classList.remove('active');
                }
            }
        }

        function updateBadges() {
            const wins = currentProfile?.wins ?? playerData.profile.wins;
            const bestStreak = currentProfile?.best_streak ?? playerData.profile.bestStreak;
            const gamesPlayed = currentProfile?.games_played ?? playerData.profile.gamesPlayed;
            const rating = currentProfile?.rating ?? playerRating;

            setBadge('badge-first-win', wins >= 1);
            setBadge('badge-winning-streak', bestStreak >= 5);
            setBadge('badge-master', rating >= 4.0);
            setBadge('badge-veteran', gamesPlayed >= 100);
            const hasBulletWin = playerData.history.some(g => g.result === 'win' && g.timeControl <= 120);
            setBadge('badge-speedster', hasBulletWin);
            const hasHardWin = playerData.history.some(g => g.result === 'win' && g.difficulty === 'hard');
            setBadge('badge-expert', hasHardWin);
        }

        function setBadge(id, unlocked) {
            const badge = document.getElementById(id);
            if (badge) {
                if (unlocked) {
                    badge.classList.remove('locked');
                    badge.classList.add('unlocked');
                } else {
                    badge.classList.remove('unlocked');
                    badge.classList.add('locked');
                }
            }
        }
        // ============================================
        // SOLO PROFILE STATS SECTION (injected into profile page)
        // ============================================
        function renderSoloProfileStats() {
            const container = document.getElementById('profile-page');
            if (!container) return;

            // Remove existing solo stats section if present
            const existing = document.getElementById('solo-profile-stats-section');
            if (existing) existing.remove();

            const DIFFS = ['easy','medium','hard','extreme'];
            const DIFF_LABELS = { easy:'Easy', medium:'Medium', hard:'Hard', extreme:'Extreme' };
            const DIFF_COLORS = { easy:'#4caf50', medium:'#4a9eff', hard:'#f5a623', extreme:'#f05a5a' };

            function fmtTime(s) {
                if (!s) return '—';
                const m = Math.floor(s/60), sec = s%60;
                return m > 0 ? `${m}m ${sec.toString().padStart(2,'0')}s` : `${sec}s`;
            }

            // Daily challenge status
            const dcDone = hasDoneChallengeTodayLocal();
            const dcResult = getTodaysChallengeResult();
            const dcStats = playerData.soloStats['daily'] || {};
            const streakData = getDailyStreak();

            const section = document.createElement('div');
            section.id = 'solo-profile-stats-section';
            section.style.cssText = 'margin-top:0;padding:0 16px 24px;';

            // ── Difficulty tabs ──────────────────────────────────────
            let activeDiff = 'easy';

            function buildTabContent(diff) {
                const st = playerData.soloStats[diff] || {};
                const bt = fmtTime(st.bestTime);
                const bs = st.bestScore ? st.bestScore.toLocaleString() : '—';
                const gp = st.gamesPlayed || 0;

                const statCard = (icon, label, value, color) => `
                    <div style="background:#1a1e2e;border-radius:14px;padding:18px 16px;
                                display:flex;align-items:center;justify-content:space-between;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:1.5rem;">${icon}</span>
                            <span style="font-size:0.9rem;color:#aaa;">${label}</span>
                        </div>
                        <span style="font-size:1.3rem;font-weight:800;color:${color||'#fff'};">${value}</span>
                    </div>`;

                return `
                    <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">
                        ${statCard('🎮','Games Solved', gp || '—', '#fff')}
                        ${statCard('⏱️','Best Time', bt, '#4a9eff')}
                        ${statCard('🏆','Best Score', bs, '#d59020')}
                    </div>`;
            }

            section.innerHTML = `
                <!-- Section header -->
                <div style="font-size:1rem;font-weight:700;color:#fff;margin-bottom:14px;padding-top:4px;">
                    📊 Solo Stats
                </div>

                <!-- Daily Challenge card -->
                <div style="background:linear-gradient(135deg,#1a1e2e,#1f2640);border:1px solid rgba(213,144,32,0.3);
                            border-radius:16px;padding:16px;margin-bottom:16px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                        <div style="font-size:0.95rem;font-weight:700;color:#d59020;">📅 Daily Challenge</div>
                        <div style="font-size:0.8rem;color:${streakData.streak>0?'#f5a623':'#555'};">
                            🔥 ${streakData.streak} day streak
                        </div>
                    </div>
                    <div style="display:flex;gap:10px;margin-bottom:12px;">
                        <div style="flex:1;background:#0f1220;border-radius:10px;padding:12px;text-align:center;">
                            <div style="font-size:1.2rem;font-weight:800;color:#d59020;">${dcStats.gamesPlayed||0}</div>
                            <div style="font-size:0.7rem;color:#666;margin-top:2px;">Completions</div>
                        </div>
                        <div style="flex:1;background:#0f1220;border-radius:10px;padding:12px;text-align:center;">
                            <div style="font-size:1.1rem;font-weight:800;color:#4a9eff;">${fmtTime(dcStats.bestTime)}</div>
                            <div style="font-size:0.7rem;color:#666;margin-top:2px;">Best Time</div>
                        </div>
                        <div style="flex:1;background:#0f1220;border-radius:10px;padding:12px;text-align:center;">
                            <div style="font-size:1rem;font-weight:800;color:#d59020;">${dcStats.bestScore?dcStats.bestScore.toLocaleString():'—'}</div>
                            <div style="font-size:0.7rem;color:#666;margin-top:2px;">Best Score</div>
                        </div>
                    </div>
                    ${dcDone && dcResult ? `
                    <div style="background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.25);border-radius:8px;
                                padding:8px 12px;font-size:0.78rem;color:#4caf50;text-align:center;">
                        ✅ Today: ${dcResult.score.toLocaleString()} pts · ${fmtTime(dcResult.elapsed)}
                    </div>` : `
                    <button onclick="launchDailyChallenge();document.querySelector('[data-page=lobby]')?.click();"
                        style="width:100%;padding:10px;background:linear-gradient(135deg,#d59020,#c07010);
                               border:none;border-radius:10px;color:#fff;font-weight:700;font-size:0.9rem;cursor:pointer;">
                        🎯 Play Today's Challenge
                    </button>`}
                </div>

                <!-- Difficulty tabs -->
                <div style="display:flex;gap:6px;margin-bottom:2px;" id="solo-diff-tabs">
                    ${DIFFS.map(d => `
                        <button data-diff="${d}"
                            style="flex:1;padding:7px 2px;border-radius:8px;border:none;cursor:pointer;font-size:0.78rem;
                                   font-weight:600;transition:all 0.15s;
                                   background:${d==='easy'?DIFF_COLORS[d]:'#1a1e2e'};
                                   color:${d==='easy'?'#fff':'#777'};"
                            onclick="switchSoloDiffTab('${d}')">
                            ${DIFF_LABELS[d]}
                        </button>`).join('')}
                </div>
                <div id="solo-diff-content">
                    ${buildTabContent('easy')}
                </div>`;

            // Expose tab switch globally
            window.switchSoloDiffTab = function(diff) {
                activeDiff = diff;
                // Update tab styles
                section.querySelectorAll('[data-diff]').forEach(btn => {
                    const isActive = btn.dataset.diff === diff;
                    btn.style.background = isActive ? DIFF_COLORS[diff] : '#1a1e2e';
                    btn.style.color = isActive ? '#fff' : '#777';
                });
                document.getElementById('solo-diff-content').innerHTML = buildTabContent(diff);
            };

            container.appendChild(section);
        }


        function recordGame(result, opponentName) {
            const ratingBefore = currentProfile?.rating ?? playerData.profile.rating;
            const gameRecord = {
                id: Date.now(),
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                difficulty: gameState.difficulty,
                timeControl: gameState.timeLimit,
                result: result,
                p1Score: gameState.scores.p1,
                p2Score: gameState.scores.p2,
                opponent: opponentName || (gameState.vsAI ?
                    CONFIG.AI_DIFFICULTY[gameState.aiDifficulty].name : 'Opponent'),
                timeRemaining: gameState.p1Time,
                ratingChange: playerRating - ratingBefore
            };

            playerData.history.unshift(gameRecord);
            if (playerData.history.length > 100) playerData.history = playerData.history.slice(0, 100);

            // Update local stats (cloud stats updated separately via saveGameToCloud)
            playerData.profile.gamesPlayed++;
            if (result === 'win') {
                playerData.profile.wins++;
                playerData.profile.currentStreak++;
                if (playerData.profile.currentStreak > playerData.profile.bestStreak)
                    playerData.profile.bestStreak = playerData.profile.currentStreak;
                // Animate streak badge on increment
                setTimeout(() => {
                    const badge = document.querySelector('.streak-badge');
                    if (badge) {
                        badge.classList.add('streak-pop');
                        setTimeout(() => badge.classList.remove('streak-pop'), 600);
                    }
                }, 700);
            } else if (result === 'loss') {
                playerData.profile.losses++;
                playerData.profile.currentStreak = 0;
            } else {
                playerData.profile.draws++;
                playerData.profile.currentStreak = 0;
            }

            recordDailyGame();
            savePlayerData();
            renderHistory();
        }

        function renderHistory(filter = 'all') {
            const historyList = document.getElementById('history-list');
            let filtered = playerData.history;
            
            if (filter !== 'all') {
                if (filter === 'win' || filter === 'loss' || filter === 'draw') {
                    filtered = playerData.history.filter(g => g.result === filter);
                } else if (filter === 'easy' || filter === 'medium' || filter === 'hard') {
                    filtered = playerData.history.filter(g => g.difficulty === filter);
                }
            }
            
            if (filtered.length === 0) {
                historyList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <div class="empty-state-text">No games found with this filter</div>
                    </div>
                `;
                return;
            }
            
            historyList.innerHTML = filtered.map(game => {
                const resultText = game.result === 'win' ? 'Victory' : 
                                  game.result === 'loss' ? 'Defeat' : 'Draw';
                const timeControlText = `${Math.floor(game.timeControl / 60)} min`;
                const ratingChangeText = game.ratingChange > 0 ? 
                    `+${game.ratingChange.toFixed(1)}` : game.ratingChange.toFixed(1);
                const ratingColor = game.ratingChange > 0 ? 'var(--accent-green)' : 
                                   game.ratingChange < 0 ? 'var(--accent-red)' : 'var(--text-muted)';
                
                return `
                    <div class="history-item">
                        <div class="history-item-header">
                            <div>
                                <span class="history-result ${game.result}">${resultText}</span>
                                <span class="history-badge ${game.difficulty}">${game.difficulty}</span>
                            </div>
                            <div class="history-date">${game.date} ${game.time}</div>
                        </div>
                        <div class="history-item-details">
                            <div class="history-detail">
                                <span>⏱️</span>
                                <span>${timeControlText}</span>
                            </div>
                            <div class="history-detail">
                                <span>🎯</span>
                                <span>${game.p1Score} - ${game.p2Score}</span>
                            </div>
                            <div class="history-detail">
                                <span>🤖</span>
                                <span>${game.opponent}</span>
                            </div>
                            <div class="history-detail" style="color: ${ratingColor}">
                                <span>📈</span>
                                <span>${ratingChangeText}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }


        function renderLeaderboard() {
            // No Supabase connection — show prompt to connect
            const leaderboardList = document.getElementById('leaderboard-list');
            if (leaderboardList) {
                leaderboardList.innerHTML = '<div class="empty-state" style="color:#555;">Sign in to see the global leaderboard</div>';
            }
        }


        // ============================================
        // PUZZLES
        // ============================================

        // ============================================
        // SUDOKU GENERATOR
        // ============================================
        // ============================================================
        // SUDOKU GENERATION ENGINE  (v3 — unique-solution, logic-graded)
        // ============================================================
        function generateSudoku(difficulty, timeLimit, variant) {
            variant = variant || gameState.variant || 'classic';
            const solution = generateCompleteSolution(variant);
            const puzzle   = solution.map(r => [...r]);
            const CLUE_RANGES = { easy:[36,40], medium:[28,33], hard:[22,27], extreme:[17,21] };
            function tcShift(tl) {
                if (!tl || tl === Infinity) return 0;
                if (tl <= 120) return +4; if (tl <= 300) return +2;
                if (tl <= 600) return  0; if (tl <= 900) return -2;
                if (tl <= 1200) return -3; return -4;
            }
            const band = CLUE_RANGES[difficulty] || CLUE_RANGES.medium;
            const shift = tcShift(timeLimit);
            const targetGivens = Math.max(17, Math.min(
                band[1] + shift,
                Math.floor(Math.random() * (band[1] - band[0] + 1)) + band[0] + shift
            ));
            const positions = [];
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) positions.push([r, c]);
            shuffle(positions);
            let givens = 81;
            for (const [r, c] of positions) {
                if (givens <= targetGivens) break;
                const backup = puzzle[r][c];
                puzzle[r][c] = 0;
                if (countSolutions(puzzle, 2) === 1) { givens--; }
                else { puzzle[r][c] = backup; }
            }
            return { puzzle, solution };
        }

        function shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }

        function countSolutions(grid, limit, variant) {
            variant = variant || gameState.variant || 'classic';
            let bestR = -1, bestC = -1, bestCount = 10;
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (grid[r][c] !== 0) continue;
                    const n = candidateCount(grid, r, c, variant);
                    if (n === 0) return 0;
                    if (n < bestCount) { bestCount = n; bestR = r; bestC = c; }
                    if (bestCount === 1) break;
                }
                if (bestCount === 1) break;
            }
            if (bestR === -1) return 1;
            let count = 0;
            for (let num = 1; num <= 9; num++) {
                if (!isValidPlacement(grid, bestR, bestC, num, variant)) continue;
                grid[bestR][bestC] = num;
                count += countSolutions(grid, limit - count, variant);
                grid[bestR][bestC] = 0;
                if (count >= limit) break;
            }
            return count;
        }

        function candidateCount(grid, row, col, variant) {
            variant = variant || gameState.variant || 'classic';
            let mask = 0;
            for (let c = 0; c < 9; c++) if (grid[row][c]) mask |= 1 << grid[row][c];
            for (let r = 0; r < 9; r++) if (grid[r][col]) mask |= 1 << grid[r][col];
            // Jigsaw uses irregular regions, NOT the standard 3x3 box —
            // without this the MRV heuristic is wrong and the solver backtracks exponentially
            if (variant === 'jigsaw' && variantData.regions) {
                const rid = variantData.regions[row][col];
                for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
                    if (variantData.regions[r][c] === rid && grid[r][c]) mask |= 1 << grid[r][c];
            } else {
                const br = Math.floor(row/3)*3, bc = Math.floor(col/3)*3;
                for (let r = br; r < br+3; r++) for (let c = bc; c < bc+3; c++) if (grid[r][c]) mask |= 1 << grid[r][c];
            }
            // Extra constraints for variants
            if (variant === 'diagonal') {
                if (row === col) for (let i = 0; i < 9; i++) if (grid[i][i]) mask |= 1 << grid[i][i];
                if (row + col === 8) for (let i = 0; i < 9; i++) if (grid[i][8-i]) mask |= 1 << grid[i][8-i];
            }
            if (variant === 'windoku') {
                for (const [wr, wc] of WINDOKU_WINDOWS) {
                    if (row >= wr && row < wr+3 && col >= wc && col < wc+3) {
                        for (let r = wr; r < wr+3; r++)
                            for (let c = wc; c < wc+3; c++)
                                if (grid[r][c]) mask |= 1 << grid[r][c];
                    }
                }
            }
            if (variant === 'antiknight') {
                const km = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
                for (const [dr, dc] of km) {
                    const nr = row+dr, nc = col+dc;
                    if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9 && grid[nr][nc]) mask |= 1 << grid[nr][nc];
                }
            }
            let count = 0; for (let n = 1; n <= 9; n++) if (!(mask & (1<<n))) count++; return count;
        }

        function generateCompleteSolution(variant) {
            variant = variant || gameState.variant || 'classic';
            const grid = Array(9).fill(null).map(() => Array(9).fill(0));

            // For jigsaw, pre-generate regions so isValidPlacement can use them
            if (variant === 'jigsaw') {
                variantData.regions = getJigsawRegions();
            }

            // For classic/antiknight fill diagonal boxes first for speed
            if (variant === 'classic' || variant === 'antiknight') {
                for (let box = 0; box < 9; box += 3) fillBox(grid, box, box);
            }
            solveSudoku(grid, variant); return grid;
        }

        function fillBox(grid, row, col) {
            const nums = [1,2,3,4,5,6,7,8,9]; shuffle(nums);
            let idx = 0;
            for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid[row+r][col+c] = nums[idx++];
        }

        function solveSudoku(grid, variant) {
            variant = variant || gameState.variant || 'classic';
            const empty = findEmptyCell(grid); if (!empty) return true;
            const [row, col] = empty;
            const nums = [1,2,3,4,5,6,7,8,9]; shuffle(nums);
            for (const num of nums) {
                if (isValidPlacement(grid, row, col, num, variant)) {
                    grid[row][col] = num;
                    if (solveSudoku(grid, variant)) return true;
                    grid[row][col] = 0;
                }
            }
            return false;
        }

        function findEmptyCell(grid) {
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (grid[r][c] === 0) return [r, c];
            return null;
        }

        // Windoku extra windows: top-left corners at (1,1),(1,5),(5,1),(5,5)
        const WINDOKU_WINDOWS = [[1,1],[1,5],[5,1],[5,5]];

        // ============================================================
        // VARIANT DATA — generated fresh each game, stored here
        // ============================================================
        let variantData = {};

        // ── KILLER ──────────────────────────────────────────────────
        function generateKillerCages(solution, difficulty) {
            // Proper Killer Sudoku cage generation:
            //   • No single-cell cages (they trivially reveal a digit)
            //   • 2–5 cells per cage, biased by difficulty
            //   • Every cell belongs to exactly one cage
            //   • Retry up to 8 times for a clean distribution
            //
            // Difficulty affects cage size distribution:
            //   easy    → mostly size-2 cages (easier to deduce)
            //   medium  → mix of size-2 and size-3
            //   hard    → larger cages (size-3 to size-5)
            //   extreme → largest cages (size-4 to size-5, fewer cages, harder to crack)
            const N = 9;
            const diff = difficulty || gameState.difficulty || 'medium';
            // cumulative probability thresholds for sizes 2, 3, 4, 5
            const sizeWeights = {
                easy:    [0.60, 0.90, 0.98, 1.00],
                medium:  [0.40, 0.75, 0.92, 1.00],
                hard:    [0.15, 0.45, 0.78, 1.00],
                extreme: [0.05, 0.20, 0.55, 1.00],
            };
            const weights = sizeWeights[diff] || sizeWeights.medium;

            function tryBuild() {
                const assigned = Array(N).fill(null).map(() => Array(N).fill(-1));
                const cages = [];
                const order = [];
                for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) order.push([r, c]);
                shuffle(order);

                let cageId = 0;
                for (const [sr, sc] of order) {
                    if (assigned[sr][sc] !== -1) continue;

                    // Weighted target size varies by difficulty
                    const rand = Math.random();
                    const targetSize = rand < weights[0] ? 2 : rand < weights[1] ? 3 : rand < weights[2] ? 4 : 5;

                    const cells = [[sr, sc]];
                    assigned[sr][sc] = cageId;
                    const frontier = [[sr, sc]];

                    while (cells.length < targetSize && frontier.length) {
                        const fi = Math.floor(Math.random() * frontier.length);
                        const [fr, fc] = frontier[fi];
                        const freeNbrs = [[fr-1,fc],[fr+1,fc],[fr,fc-1],[fr,fc+1]]
                            .filter(([nr,nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && assigned[nr][nc] === -1);
                        if (!freeNbrs.length) { frontier.splice(fi, 1); continue; }
                        const [nr, nc] = freeNbrs[Math.floor(Math.random() * freeNbrs.length)];
                        assigned[nr][nc] = cageId;
                        cells.push([nr, nc]);
                        frontier.push([nr, nc]);
                    }

                    const sum = cells.reduce((s, [r, c]) => s + solution[r][c], 0);
                    cages.push({ id: cageId, cells, sum });
                    cageId++;
                }

                // Mop-up: merge any leftover isolated cells into an adjacent cage
                for (let r = 0; r < N; r++) {
                    for (let c = 0; c < N; c++) {
                        if (assigned[r][c] !== -1) continue;
                        const adj = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]
                            .find(([nr,nc]) => nr >= 0 && nr < N && nc >= 0 && nc < N && assigned[nr][nc] !== -1);
                        if (adj) {
                            const tid = assigned[adj[0]][adj[1]];
                            assigned[r][c] = tid;
                            const cage = cages.find(cg => cg.id === tid);
                            if (cage) { cage.cells.push([r, c]); cage.sum += solution[r][c]; }
                        } else {
                            // Last resort single-cell cage
                            cages.push({ id: cageId, cells: [[r, c]], sum: solution[r][c] });
                            assigned[r][c] = cageId++;
                        }
                    }
                }

                // Reject layout if more than 2 single-cell cages exist
                const singleCount = cages.filter(cg => cg.cells.length === 1).length;
                if (singleCount > 2) return null;
                return { cages, assigned };
            }

            for (let attempt = 0; attempt < 8; attempt++) {
                const result = tryBuild();
                if (result) return result;
            }
            // Ultimate fallback
            return tryBuild() || tryBuild();
        }

        function killerValidForCell(grid, row, col, num, cages, assigned) {
            const cid = assigned[row][col];
            const cage = cages.find(c => c.id === cid);
            if (!cage) return true;
            // no repeat in cage
            for (const [r,c] of cage.cells)
                if ((r!==row||c!==col) && grid[r][c]===num) return false;
            // partial-sum check: running sum + num must not exceed cage sum
            const partial = cage.cells.reduce((s,[r,c]) => s + (r===row&&c===col ? 0 : grid[r][c]), 0);
            if (partial + num > cage.sum) return false;
            // if this fills the cage, sum must be exact
            const filled = cage.cells.filter(([r,c]) => r!==row||c!==col).every(([r,c]) => grid[r][c]!==0);
            if (filled && partial + num !== cage.sum) return false;
            return true;
        }

        // ── JIGSAW ──────────────────────────────────────────────────
        // Fixed 9-region layout — each region has exactly 9 cells, replacing 3×3 boxes
        // Each layout must have exactly 9 cells per region (0–8).
        // All 4 layouts below are verified: every region count = 9.
        const JIGSAW_LAYOUTS = [
            // Layout A
            [
                [6,5,5,5,4,4,4,4,4],
                [6,6,5,5,3,4,3,4,4],
                [6,6,5,3,3,3,3,3,4],
                [6,6,5,5,3,3,2,2,2],
                [6,6,5,7,1,1,2,8,8],
                [7,7,7,7,1,2,2,8,8],
                [7,0,7,7,1,2,2,2,8],
                [0,0,0,7,1,1,1,1,8],
                [0,0,0,0,0,1,8,8,8],
            ],
            // Layout B
            [
                [6,6,6,6,6,1,1,1,1],
                [6,6,5,5,5,5,0,0,1],
                [6,7,7,5,5,5,0,0,1],
                [6,7,4,4,5,0,0,1,1],
                [7,7,8,4,5,4,0,0,1],
                [7,7,8,4,4,4,0,2,2],
                [7,7,8,8,3,4,4,2,2],
                [8,8,8,3,3,2,2,2,2],
                [8,8,3,3,3,3,3,3,2],
            ],
            // Layout C
            [
                [7,6,6,6,6,6,6,5,5],
                [7,6,6,6,1,1,1,5,5],
                [7,7,0,0,1,1,3,5,5],
                [7,7,0,0,1,1,3,5,5],
                [7,7,0,0,0,1,3,5,3],
                [8,7,0,0,2,1,3,3,3],
                [8,8,2,2,2,2,2,3,4],
                [8,8,8,2,4,2,4,3,4],
                [8,8,8,2,4,4,4,4,4],
            ],
            // Layout D
            [
                [2,2,2,2,2,2,1,1,1],
                [3,0,2,2,2,1,1,1,1],
                [3,0,0,0,0,0,0,1,1],
                [3,0,0,4,7,7,7,7,7],
                [3,3,4,4,4,5,7,7,7],
                [3,3,4,4,4,5,5,7,6],
                [3,8,4,4,5,5,5,6,6],
                [3,8,8,8,8,5,6,6,6],
                [8,8,8,8,5,5,6,6,6],
            ],
        ];

        function getJigsawRegions() {
            const layout = JIGSAW_LAYOUTS[Math.floor(Math.random() * JIGSAW_LAYOUTS.length)];
            // Randomly permute region IDs for variety
            const perm = [0,1,2,3,4,5,6,7,8]; shuffle(perm);
            return layout.map(row => row.map(v => perm[v]));
        }

        function jigsawValidForCell(grid, row, col, num, regions) {
            const rid = regions[row][col];
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
                if ((r!==row||c!==col) && regions[r][c]===rid && grid[r][c]===num) return false;
            return true;
        }

        // Jigsaw uses region instead of box in isValidPlacement
        function isValidPlacementJigsaw(grid, row, col, num, regions) {
            for (let c = 0; c < 9; c++) if (grid[row][c]===num) return false;
            for (let r = 0; r < 9; r++) if (grid[r][col]===num) return false;
            if (!jigsawValidForCell(grid, row, col, num, regions)) return false;
            return true;
        }

        // ── THERMO ──────────────────────────────────────────────────
        function generateThermos() {
            const thermos = [];
            const used = new Set();
            for (let attempt = 0; attempt < 40 && thermos.length < 5; attempt++) {
                const r0 = Math.floor(Math.random()*9), c0 = Math.floor(Math.random()*9);
                if (used.has(`${r0},${c0}`)) continue;
                const dirs = [[-1,0],[1,0],[0,-1],[0,1]]; shuffle(dirs);
                const [dr,dc] = dirs[0];
                const len = 3 + Math.floor(Math.random()*3); // 3-5
                const cells = [[r0,c0]];
                let ok = true;
                for (let i = 1; i < len; i++) {
                    const nr = cells[i-1][0]+dr, nc = cells[i-1][1]+dc;
                    if (nr<0||nr>8||nc<0||nc>8||used.has(`${nr},${nc}`)) { ok=false; break; }
                    cells.push([nr,nc]);
                }
                if (!ok || cells.length < 3) continue;
                cells.forEach(([r,c]) => used.add(`${r},${c}`));
                thermos.push(cells);
            }
            return thermos;
        }

        function thermoValidForCell(grid, row, col, num, thermos) {
            for (const thermo of thermos) {
                const idx = thermo.findIndex(([r,c]) => r===row&&c===col);
                if (idx === -1) continue;
                if (idx > 0) {
                    const [pr,pc] = thermo[idx-1];
                    if (grid[pr][pc]!==0 && num <= grid[pr][pc]) return false;
                }
                if (idx < thermo.length-1) {
                    const [nr,nc] = thermo[idx+1];
                    if (grid[nr][nc]!==0 && num >= grid[nr][nc]) return false;
                }
            }
            return true;
        }

        // ── CONSECUTIVE ─────────────────────────────────────────────
        function generateConsecutivePairs(solution) {
            const pairs = [];
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
                if (c+1<9 && Math.abs(solution[r][c]-solution[r][c+1])===1 && Math.random()<0.45)
                    pairs.push({r1:r,c1:c,r2:r,c2:c+1});
                if (r+1<9 && Math.abs(solution[r][c]-solution[r+1][c])===1 && Math.random()<0.45)
                    pairs.push({r1:r,c1:c,r2:r+1,c2:c});
            }
            return pairs;
        }

        function consecutiveValidForCell(grid, row, col, num, pairs) {
            for (const p of pairs) {
                if (p.r1===row&&p.c1===col) {
                    const v=grid[p.r2][p.c2]; if(v&&Math.abs(num-v)!==1) return false;
                }
                if (p.r2===row&&p.c2===col) {
                    const v=grid[p.r1][p.c1]; if(v&&Math.abs(num-v)!==1) return false;
                }
            }
            return true;
        }

        // ── ARROW ───────────────────────────────────────────────────
        function generateArrows(solution) {
            // Strategy: for each candidate circle cell, search all 8 directions for a
            // contiguous sequence of cells whose solution values sum exactly to the
            // circle's solution value. This is far more reliable than random attempts
            // because we start from what we *need* (the target sum) and look for it.
            const arrows = [];
            const used = new Set();
            const allPos = [];
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) allPos.push([r,c]);
            shuffle(allPos);

            const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];

            for (const [cr, cc] of allPos) {
                if (arrows.length >= 5) break;
                if (used.has(`${cr},${cc}`)) continue;
                const target = solution[cr][cc]; // guaranteed 1-9
                let found = false;
                const shuffledDirs = [...dirs]; shuffle(shuffledDirs);
                for (const [dr, dc] of shuffledDirs) {
                    if (found) break;
                    const cells = [];
                    let sum = 0;
                    let r = cr, c = cc;
                    for (let step = 1; step <= 4; step++) {
                        r += dr; c += dc;
                        if (r < 0 || r > 8 || c < 0 || c > 8) break;
                        if (used.has(`${r},${c}`) || (r===cr && c===cc)) break;
                        sum += solution[r][c];
                        cells.push([r,c]);
                        if (sum === target && cells.length >= 1) {
                            used.add(`${cr},${cc}`);
                            cells.forEach(([ar,ac])=>used.add(`${ar},${ac}`));
                            arrows.push({circle:[cr,cc], cells:[...cells], sum:target});
                            found = true;
                            break;
                        }
                        if (sum > target) break;
                    }
                }
            }
            return arrows;
        }

        function arrowValidForCell(grid, row, col, num, arrows) {
            for (const arrow of arrows) {
                const [cr,cc] = arrow.circle;
                const isCircle = cr===row&&cc===col;
                const arrowIdx = arrow.cells.findIndex(([r,c])=>r===row&&c===col);
                if (!isCircle && arrowIdx===-1) continue;
                const circleVal = isCircle ? num : grid[cr][cc];
                if (!circleVal) continue;
                const vals = arrow.cells.map(([r,c])=>r===row&&c===col?num:grid[r][c]);
                const partialSum = vals.reduce((s,v)=>s+(v||0),0);
                if (partialSum > circleVal) return false;
                if (vals.every(v=>v>0) && partialSum !== circleVal) return false;
            }
            return true;
        }

        // ── EVEN-ODD ────────────────────────────────────────────────
        function generateEvenOddMask(solution) {
            const mask = Array(9).fill(null).map(()=>Array(9).fill(null));
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
                if (Math.random() < 0.6)
                    mask[r][c] = solution[r][c]%2===0 ? 'even' : 'odd';
            return mask;
        }

        function evenOddValidForCell(num, row, col, mask) {
            const m = mask[row][col];
            if (!m) return true;
            if (m==='even' && num%2!==0) return false;
            if (m==='odd'  && num%2!==1) return false;
            return true;
        }

        // ── MASTER isValidPlacement (all variants) ───────────────────
        function isValidPlacement(grid, row, col, num, variant) {
            // Always: row uniqueness
            for (let c = 0; c < 9; c++) if (grid[row][c]===num) return false;
            // Always: col uniqueness
            for (let r = 0; r < 9; r++) if (grid[r][col]===num) return false;

            variant = variant || gameState.variant || 'classic';

            // Jigsaw replaces box constraint entirely
            if (variant === 'jigsaw') {
                if (variantData.regions) {
                    if (!jigsawValidForCell(grid, row, col, num, variantData.regions)) return false;
                }
                // no box check for jigsaw
            } else {
                // Standard 3×3 box for all other variants
                const br = Math.floor(row/3)*3, bc = Math.floor(col/3)*3;
                for (let r = br; r < br+3; r++)
                    for (let c = bc; c < bc+3; c++)
                        if (grid[r][c]===num) return false;
            }

            if (variant === 'diagonal') {
                if (row===col) for (let i=0;i<9;i++) if (grid[i][i]===num&&i!==row) return false;
                if (row+col===8) for (let i=0;i<9;i++) if (grid[i][8-i]===num&&i!==row) return false;
            }

            if (variant === 'windoku') {
                for (const [wr,wc] of WINDOKU_WINDOWS) {
                    if (row>=wr&&row<wr+3&&col>=wc&&col<wc+3) {
                        for (let r=wr;r<wr+3;r++)
                            for (let c=wc;c<wc+3;c++)
                                if (grid[r][c]===num&&(r!==row||c!==col)) return false;
                    }
                }
            }

            if (variant === 'antiknight') {
                const km=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
                for (const [dr,dc] of km) {
                    const nr=row+dr, nc=col+dc;
                    if (nr>=0&&nr<9&&nc>=0&&nc<9&&grid[nr][nc]===num) return false;
                }
            }

            if (variant==='killer' && variantData.cages && variantData.killerAssigned)
                if (!killerValidForCell(grid,row,col,num,variantData.cages,variantData.killerAssigned)) return false;

            if (variant==='thermo' && variantData.thermos)
                if (!thermoValidForCell(grid,row,col,num,variantData.thermos)) return false;

            if (variant==='consecutive' && variantData.consecutivePairs)
                if (!consecutiveValidForCell(grid,row,col,num,variantData.consecutivePairs)) return false;

            if (variant==='arrow' && variantData.arrows)
                if (!arrowValidForCell(grid,row,col,num,variantData.arrows)) return false;

            if (variant==='evenodd' && variantData.evenOddMask)
                if (!evenOddValidForCell(num,row,col,variantData.evenOddMask)) return false;

            return true;
        }

        // ============================================
        // DOM ELEMENTS
        // ============================================
        const canvas = document.getElementById('sudoku-canvas');
        const ctx = canvas.getContext('2d');
        const lobby = document.getElementById('lobby');
        const gameScreen = document.getElementById('game-screen');
        const numberPicker = document.getElementById('number-picker');

        // ============================================
        // SIDE MENU & PAGE NAVIGATION
        // ============================================
        function setupSideMenu() {
            const menuOverlay = document.getElementById('side-menu-overlay');
            const sideMenu = document.getElementById('side-menu');
            const menuBtns = document.querySelectorAll('.menu-btn');
            const menuItems = document.querySelectorAll('.side-menu-item');
            
            // Open menu
            menuBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    sideMenu.classList.add('active');
                    menuOverlay.classList.add('active');
                });
            });
            
            // Close menu
            menuOverlay.addEventListener('click', () => {
                sideMenu.classList.remove('active');
                menuOverlay.classList.remove('active');
            });
            
            // Navigate between pages
            menuItems.forEach(item => {
                item.addEventListener('click', () => {
                    const page = item.dataset.page;
                    
                    // Update active menu item
                    menuItems.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    
                    // Show appropriate page
                    document.getElementById('lobby').style.display = 'none';
                    document.getElementById('settings-page').classList.remove('active');
                    document.getElementById('profile-page').classList.remove('active');
                    document.getElementById('leaderboard-page').classList.remove('active');
                    document.getElementById('history-page').classList.remove('active');
                    const friendsPage = document.getElementById('friends-page');
                    if (friendsPage) friendsPage.classList.remove('active');
                    const tournamentsPage = document.getElementById('tournaments-page');
                    if (tournamentsPage) tournamentsPage.classList.remove('active');
                    
                    if (page === 'lobby') {
                        document.getElementById('lobby').style.display = 'block';
                        checkAndShowOngoingBanner();
                    } else if (page === 'settings') {
                        document.getElementById('settings-page').classList.add('active');
                    } else if (page === 'profile') {
                        document.getElementById('profile-page').classList.add('active');
                        updateAllDisplays();
                        if (currentProfile) updateUIWithProfile();
                        renderSoloProfileStats();
                    } else if (page === 'leaderboard') {
                        document.getElementById('leaderboard-page').classList.add('active');
                        if (supabaseClient) loadLeaderboard();
                        else renderLeaderboard();
                    } else if (page === 'history') {
                        document.getElementById('history-page').classList.add('active');
                        if (currentUser && supabaseClient) loadGameHistory();
                        else renderHistory();
                    } else if (page === 'friends') {
                        if (friendsPage) friendsPage.classList.add('active');
                        if (supabaseClient && currentUser) {
                            loadFriends();
                        } else if (supabaseClient) {
                            // Auth might still be initialising — show prompt and retry
                            const fl = document.getElementById('friends-list');
                            if (fl) fl.innerHTML = '<div class="empty-state" style="color:#555;">Sign in to see your friends</div>';
                            // Retry once auth resolves
                            const retry = setInterval(() => {
                                if (currentUser) { clearInterval(retry); loadFriends(); }
                            }, 500);
                            setTimeout(() => clearInterval(retry), 5000);
                        }
                    } else if (page === 'tournaments') {
                        if (tournamentsPage) tournamentsPage.classList.add('active');
                        loadTournamentsPage();
                    }
                    
                    // Close menu
                    sideMenu.classList.remove('active');
                    menuOverlay.classList.remove('active');
                });
            });
        }

        function setupSettings() {
            // Username input
            const usernameInput = document.getElementById('username-input');
            usernameInput.addEventListener('change', () => {
                playerData.settings.username = usernameInput.value || 'Player';
                savePlayerData();
            });
            
            // Theme selector
            const themeSelect = document.getElementById('theme-select');
            themeSelect.addEventListener('change', () => {
                playerData.settings.boardTheme = themeSelect.value;
                savePlayerData();
                // Redraw board if game is running
                if (gameState.isRunning || gameState.claims.length > 0) {
                    markGridDirty();
                    drawGrid();
                }
            });
            
            // Sound toggle
            document.getElementById('sound-toggle').addEventListener('click', function() {
                this.classList.toggle('active');
                playerData.settings.soundEnabled = this.classList.contains('active');
                savePlayerData();
            });
            document.getElementById('colorblind-toggle').addEventListener('click', function() {
                this.classList.toggle('active');
                playerData.settings.colorBlind = this.classList.contains('active');
                savePlayerData();
                if (gameState.isRunning) { markGridDirty(); drawGrid(); }
            });
            
            // Animations toggle
            document.getElementById('animations-toggle').addEventListener('click', function() {
                this.classList.toggle('active');
                playerData.settings.animationsEnabled = this.classList.contains('active');
                savePlayerData();
            });
            
            // Clear history
            document.getElementById('clear-history-btn').addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all game history? This cannot be undone.')) {
                    playerData.history = [];
                    savePlayerData();
                    renderHistory();
                    alert('Game history cleared!');
                }
            });
            
            // Reset rating
            document.getElementById('reset-rating-btn').addEventListener('click', () => {
                if (confirm('Are you sure you want to reset your rating to 2.0? This cannot be undone.')) {
                    playerRating = CONFIG.STARTING_RATING;
                    playerData.profile = {
                        rating: CONFIG.STARTING_RATING,
                        gamesPlayed: 0,
                        wins: 0,
                        losses: 0,
                        draws: 0,
                        bestStreak: 0,
                        currentStreak: 0,
                        totalTimePlayed: 0
                    };
                    playerData.history = [];
                    savePlayerData();
                    alert('Rating and stats reset!');
                }
            });
        }

        function setupHistory() {
            const filterChips = document.querySelectorAll('.filter-chip');
            filterChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    filterChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    renderHistory(chip.dataset.filter);
                });
            });
        }

        function setupPermanentNumberPad() {
            // Mode toggle buttons
            document.getElementById('pen-mode-btn').addEventListener('click', function() {
                if (gameState.gameMode === 'passplay' && gameState.currentPlayer !== 1) return;
                gameState.inputMode = 'pen';
                document.getElementById('pen-mode-btn').classList.add('active');
                document.getElementById('pencil-mode-btn').classList.remove('pencil-active');
                document.getElementById('erase-btn').classList.remove('active');
                updateNumberPadVisuals();
            });

            document.getElementById('pencil-mode-btn').addEventListener('click', function() {
                gameState.inputMode = 'pencil';
                document.getElementById('pen-mode-btn').classList.remove('active');
                document.getElementById('pencil-mode-btn').classList.add('pencil-active');
                document.getElementById('erase-btn').classList.remove('active');
                updateNumberPadVisuals();
            });

            document.getElementById('erase-btn').addEventListener('click', function() {
                if (gameState.selectedCell) {
                    eraseCell(gameState.selectedCell.row, gameState.selectedCell.col);
                }
            });

            document.getElementById('hint-btn').addEventListener('click', function() {
                if (!gameState.isRunning) return;
                const N = gameState.gridSize || 9;
                const maxHints = { easy: 5, medium: 3, hard: 1, extreme: 0 }[gameState.difficulty] ?? 3;
                if (gameState.hintsUsed >= maxHints) {
                    showToast(`No hints left (${maxHints} max on ${gameState.difficulty})`, 2200);
                    return;
                }
                // Find a random empty cell and reveal its solution value
                const emptyCells = [];
                for (let r = 0; r < N; r++)
                    for (let c = 0; c < N; c++)
                        if (gameState.claims[r][c] === 0 && gameState.puzzle[r][c] === 0)
                            emptyCells.push([r, c]);
                if (emptyCells.length === 0) return;
                const [hr, hc] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                const val = gameState.solution[hr][hc];
                gameState.puzzle[hr][hc] = val;
                gameState.claims[hr][hc] = 1;
                // Hint awards base 200 pts (no speed bonus since it's assisted)
                gameState.scores.p1 += 200;
                _lastCorrectMoveTime = Date.now(); // reset speed timer after hint
                gameState.hintsUsed++;
                spawnFloatingScore(hr, hc, '+200', '#d59020');
                updateHintDisplay();
                updateRemainingCounts();
                updateScores();
                markGridDirty();
                drawGrid();
                checkGameEnd();
                showToast(`💡 Hint used (${gameState.hintsUsed}/${maxHints})`, 1800);
            });

            // Number pad buttons
            document.querySelectorAll('.num-pad-btn[data-num]').forEach(btn => {
                btn.addEventListener('click', () => {
                    // Block pen moves during opponent's turn, but always allow pencil
                    if (gameState.gameMode === 'passplay' && gameState.currentPlayer !== 1 && gameState.inputMode !== 'pencil') return;
                    const num = parseInt(btn.dataset.num);
                    if (!btn.classList.contains('disabled')) {
                        handleNumberInput(num);
                    }
                });
            });
        }

        function updateNumberPadVisuals() {
            document.querySelectorAll('.num-pad-btn[data-num]').forEach(btn => {
                if (gameState.inputMode === 'pencil') {
                    btn.classList.add('pencil-mode');
                } else {
                    btn.classList.remove('pencil-mode');
                }
            });
        }

        function updateRemainingCounts() {
            const _GN = gameState.gridSize || 9;
            for (let num = 1; num <= _GN; num++) {
                let count = 0;
                for (let r = 0; r < _GN; r++) {
                    for (let c = 0; c < _GN; c++) {
                        if (gameState.puzzle[r][c] === num) count++;
                    }
                }
                const remaining = _GN - count;
                const elem = document.getElementById(`remaining-${num}`);
                if (elem) {
                    elem.textContent = remaining;
                }
                
                // Disable button if all 9 are placed
                const btn = document.querySelector(`.num-pad-btn[data-num="${num}"]`);
                if (btn) {
                    if (remaining === 0) {
                        btn.classList.add('disabled');
                    } else {
                        btn.classList.remove('disabled');
                    }
                }
            }
        }

        function updateHintDisplay() {
            const N = gameState.gridSize || 9;
            const maxHints = { easy: 5, medium: 3, hard: 1, extreme: 0 }[gameState.difficulty] ?? 3;
            const remaining = Math.max(0, maxHints - (gameState.hintsUsed || 0));
            const el = document.getElementById('hint-count');
            const btn = document.getElementById('hint-btn');
            if (el) el.textContent = remaining;
            if (btn) {
                btn.style.opacity = remaining === 0 ? '0.3' : '1';
                btn.title = remaining === 0
                    ? `No hints left on ${gameState.difficulty}`
                    : `Hint — reveal one cell (${remaining} left)`;
            }
        }

        function handleNumberInput(num) {
            // In pass & play mode during opponent's turn, only allow pencil mode
            if (gameState.gameMode === 'passplay' && gameState.currentPlayer !== 1 && gameState.inputMode !== 'pencil') {
                return; // Don't allow pen mode during opponent's turn, but pencil is OK
            }

            if (!gameState.selectedCell) {
                // If no cell selected, select first empty cell
                const _GS = gameState.gridSize || 9;
                outer9: for (let r = 0; r < _GS; r++) {
                    for (let c = 0; c < _GS; c++) {
                        if (gameState.claims[r][c] === 0) {
                            gameState.selectedCell = { row: r, col: c };
                            markGridDirty();
                            drawGrid();
                            break outer9;
                        }
                    }
                }
            }

            if (!gameState.selectedCell) return;

            const { row, col } = gameState.selectedCell;

            if (gameState.inputMode === 'pencil') {
                // Pencil mode: toggle pencil mark
                // pencilMarks is always initialised as a 9×9 array of Sets in startGame/resumeGame
                const cell = gameState.pencilMarks[row][col];
                if (cell.has(num)) {
                    cell.delete(num);
                } else {
                    cell.add(num);
                }
                markGridDirty();
                drawGrid();
            } else {
                // Pen mode: make the move
                makeMove(num);
            }
        }

        function eraseCell(row, col) {
            if (gameState.claims[row][col] === 1) {
                // Can only erase own cells
                gameState.puzzle[row][col] = 0;
                gameState.claims[row][col] = 0;
                gameState.scores.p1 = Math.max(0, gameState.scores.p1 - 1);
                updateScores();
            }
            // Clear pencil marks (with safety check)
            if (gameState.pencilMarks && gameState.pencilMarks[row] && gameState.pencilMarks[row][col]) {
                gameState.pencilMarks[row][col].clear();
            }
            markGridDirty();
            drawGrid();
            updateRemainingCounts();
        }

        // ============================================
        // INITIALIZATION
        // ============================================
        function loadRating() {
            // Deprecated - now handled by loadPlayerData()
        }

        function saveRating() {
            savePlayerData();
        }

        // ============================================
        // EVENT LISTENERS
        // ============================================
        function setupEventListeners() {
            // Side menu
            setupSideMenu();
            
            // Settings
            setupSettings();
            
            // History filters
            setupHistory();
            
            // Tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    if (tab.dataset.tab === 'puzzles') {
                        openTechniqueDojo();
                    }
                });
            });

            // ── Time-control helpers ────────────────────────────────────────
            // Category badge labels keyed by seconds
            function timeBadge(secs) {
                if (secs === 0)       return 'Count up';
                if (secs <= 45)      return 'Lightning';
                if (secs <= 120)     return 'Bullet';
                if (secs <= 300)     return 'Blitz';
                if (secs <= 900)     return 'Rapid';
                return 'Classical';
            }

            function setTimeLimit(secs) {
                // 0 = untimed (solo count-up), otherwise countdown
                gameState.timeLimit = secs > 0 ? secs : 9999;
                // Sync all three selects
                ['lobby-time-select','ai-time-select','solo-time-select'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        // Find closest option (exact or nearest)
                        const opt = Array.from(el.options).find(o => parseInt(o.value) === secs);
                        if (opt) el.value = String(secs);
                    }
                });
                // Update badges
                const badge = timeBadge(secs);
                ['lobby-time-badge','ai-time-badge'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = badge;
                });
                const soloBadgeEl = document.getElementById('solo-time-badge');
                if (soloBadgeEl) soloBadgeEl.textContent = secs === 0 ? 'Count up' : badge;
            }

            // Wire lobby select
            const lobbySelect = document.getElementById('lobby-time-select');
            if (lobbySelect) {
                lobbySelect.addEventListener('change', () => {
                    setTimeLimit(parseInt(lobbySelect.value));
                });
            }

            // Wire AI modal select
            const aiSelect = document.getElementById('ai-time-select');
            if (aiSelect) {
                aiSelect.addEventListener('change', () => {
                    setTimeLimit(parseInt(aiSelect.value));
                    // update badge immediately
                    const b = document.getElementById('ai-time-badge');
                    if (b) b.textContent = timeBadge(parseInt(aiSelect.value));
                });
            }

            // Wire Solo modal select
            const soloSelect = document.getElementById('solo-time-select');
            if (soloSelect) {
                soloSelect.addEventListener('change', () => {
                    const secs = parseInt(soloSelect.value);
                    gameState.timeLimit = secs > 0 ? secs : 9999;
                    const b = document.getElementById('solo-time-badge');
                    if (b) b.textContent = secs === 0 ? 'Count up' : timeBadge(secs);
                });
            }

            // Mode cards
            document.querySelectorAll('.mode-card[data-mode]').forEach(card => {
                card.addEventListener('click', () => {
                    document.querySelectorAll('.mode-card[data-mode]').forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    gameState.gameMode = card.dataset.mode;
                });
            });

            // Variant pills
            // Ensure variant description is prominent
            const descEl = document.getElementById('variant-desc');
            if (descEl) {
                descEl.style.fontWeight = '500';
                descEl.style.color = 'var(--text-primary)';
                descEl.style.padding = '6px 4px';
                descEl.style.minHeight = '2.4em';
            }
            const VARIANT_DESCS = {
                classic:    'Standard 9×9 Sudoku — rows, columns and boxes each contain 1–9.',
                killer:     'Cages must sum to the shown total. No digit repeats within a cage.',
                diagonal:   'Both main diagonals must also contain each digit exactly once.',
                jigsaw:     'Irregular jigsaw regions replace the standard 3×3 boxes.',
                thermo:     'Values must strictly increase along each thermometer from the bulb.',
                consecutive:'Adjacent cells connected by a bar must be consecutive (differ by 1).',
                arrow:      'Digits on an arrow must sum to the circled digit at its base.',
                evenodd:    'Circle = must be even. Square = must be odd.',
                windoku:    'Four shaded 3×3 windows also act as extra boxes.',
                antiknight: 'No two identical digits may be a chess knight\'s move apart.',
            };
            document.querySelectorAll('.variant-pill[data-variant]').forEach(pill => {
                pill.addEventListener('click', () => {
                    document.querySelectorAll('.variant-pill[data-variant]').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    gameState.variant = pill.dataset.variant;
                    const descEl = document.getElementById('variant-desc');
                    if (descEl) descEl.textContent = VARIANT_DESCS[pill.dataset.variant] || '';
                    updateVariantBadge();
                });
            });

            // AI toggle - now opens difficulty modal
            document.getElementById('ai-toggle-card').addEventListener('click', function() {
                if (!gameState.vsAI) {
                    // Show AI difficulty selection modal
                    document.getElementById('ai-difficulty-modal').classList.add('active');
                } else {
                    // Disable AI
                    gameState.vsAI = false;
                    this.classList.remove('active');
                    const desc = this.querySelector('.mode-desc');
                    desc.textContent = 'Tap to enable AI';
                }
            });

            // AI Difficulty selection
            document.querySelectorAll('.ai-difficulty-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    gameState.aiDifficulty = btn.dataset.aiDiff;
                    gameState.vsAI = true;
                    
                    // Update AI toggle card
                    const aiCard = document.getElementById('ai-toggle-card');
                    aiCard.classList.add('active');
                    const desc = aiCard.querySelector('.mode-desc');
                    const difficultyNames = {
                        easy: 'Easy AI',
                        medium: 'Medium AI',
                        hard: 'Hard AI'
                    };
                    desc.textContent = difficultyNames[gameState.aiDifficulty] + ' enabled';
                    
                    // Close modal
                    document.getElementById('ai-difficulty-modal').classList.remove('active');
                });
            });

            document.getElementById('ai-difficulty-close').addEventListener('click', () => {
                document.getElementById('ai-difficulty-modal').classList.remove('active');
            });

            // Start game
            document.getElementById('start-game-btn').addEventListener('click', startGame);
            document.getElementById('solo-sudoku-btn').addEventListener('click', () => {
                document.getElementById('difficulty-modal').classList.add('active');
            });

            // Inject Daily Challenge button into lobby if not already there
            (function injectDailyChallengeBtn() {
                if (document.getElementById('daily-challenge-lobby-btn')) return;
                const soloBtn = document.getElementById('solo-sudoku-btn');
                if (!soloBtn) return;

                const today = new Date().toISOString().slice(0,10);
                const dcKey = 'sudoku_daily_challenge_' + today;
                const done = !!localStorage.getItem(dcKey);
                const dcResult = done ? JSON.parse(localStorage.getItem(dcKey)||'{}') : null;

                const btn = document.createElement('button');
                btn.id = 'daily-challenge-lobby-btn';
                btn.className = soloBtn.className; // match styling
                btn.style.cssText = `
                    width:100%;margin-top:10px;padding:14px 20px;
                    background:linear-gradient(135deg,#1f2030,#1a1c2c);
                    border:1px solid rgba(213,144,32,0.4);
                    border-radius:14px;color:#d59020;font-weight:700;
                    font-size:0.95rem;cursor:pointer;text-align:left;
                    display:flex;align-items:center;gap:12px;
                `;
                btn.innerHTML = done
                    ? `<span style="font-size:1.4rem;">✅</span>
                       <div>
                         <div>Daily Challenge — Done!</div>
                         <div style="font-size:0.75rem;color:#666;margin-top:2px;">\${dcResult?.score?.toLocaleString?.() || ''} pts · Come back tomorrow</div>
                       </div>`
                    : `<span style="font-size:1.4rem;">📅</span>
                       <div>
                         <div>Daily Challenge</div>
                         <div style="font-size:0.75rem;color:#777;margin-top:2px;">New puzzle every day · Hard difficulty</div>
                       </div>
                       <div style="margin-left:auto;background:#d59020;color:#161512;
                                   font-size:0.65rem;font-weight:800;padding:3px 7px;
                                   border-radius:4px;">NEW</div>`;

                btn.addEventListener('click', () => {
                    if (!done) launchDailyChallenge();
                    else showToast('✅ Already completed today! Come back tomorrow.', 2500);
                });

                soloBtn.parentNode.insertBefore(btn, soloBtn.nextSibling);
            })();

            // Difficulty selection (for puzzles)
            document.querySelectorAll('.difficulty-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('difficulty-modal').classList.remove('active');
                    if (btn.dataset.size === '16') {
                        // 16×16 mode
                        startGame16(btn.dataset.diff || 'medium');
                    } else {
                        gameState.difficulty = btn.dataset.diff;
                        gameState.vsAI   = false;
                        gameState.gameMode = 'solo';
                        startGame();
                    }
                });
            });

            document.getElementById('difficulty-close').addEventListener('click', () => {
                document.getElementById('difficulty-modal').classList.remove('active');
                document.querySelector('.tab[data-tab="quick"]').click();
            });

            // Game controls
            document.getElementById('resign-btn').addEventListener('click', resignGame);
            document.getElementById('new-game-btn').addEventListener('click', resetGame);
            document.getElementById('game-menu-btn').addEventListener('click', exitToLobby);

            // Result modal
            document.getElementById('play-again-btn').addEventListener('click', () => {
                document.getElementById('result-modal').classList.remove('active');
                resetGame();
            });
            document.getElementById('back-to-lobby-btn').addEventListener('click', () => {
                document.getElementById('result-modal').classList.remove('active');
                exitToLobby();
            });

            // Number picker
            document.querySelectorAll('.number-btn[data-num]').forEach(btn => {
                btn.addEventListener('click', () => {
                    makeMove(parseInt(btn.dataset.num));
                    hideNumberPicker();
                });
            });
            document.getElementById('picker-close').addEventListener('click', hideNumberPicker);

            // Permanent number pad
            setupPermanentNumberPad();

            // Canvas
            canvas.addEventListener('click', handleCanvasClick);
            canvas.addEventListener('touchstart', handleTouch, {passive: false});

            // Keyboard input
            document.addEventListener('keydown', handleKeyDown);
        }

        // ============================================
        // CANVAS
        // ============================================
        function resizeCanvas() {
            const container = document.querySelector('.board-container');
            const size = Math.min(container.clientWidth, container.clientHeight, 500);
            
            canvas.width = size * window.devicePixelRatio;
            canvas.height = size * window.devicePixelRatio;
            canvas.style.width = size + 'px';
            canvas.style.height = size + 'px';
            
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            
            if (gameState.isRunning || gameState.claims.length > 0) {
                markGridDirty(); drawGrid();
            }
        }

        // ============================================
        // GAME LIFECYCLE
        // ============================================
        function startGame() {
            // Ensure we're in standard 9×9 mode (in case the user was in 16×16 before)
            gameState.gridSize = 9;
            gameState.boxSize  = 3;
            rebuildNumberPad(9);
            // Generate a fresh puzzle each time, scaled to time control.
            const puzzleData = generateSudoku(gameState.difficulty, gameState.timeLimit);
            gameState.puzzle = puzzleData.puzzle.map(row => [...row]);
            gameState.solution = puzzleData.solution.map(row => [...row]);

            // Capture jigsaw regions that were baked in during generation (if any)
            const jigsawRegionsFromGeneration = variantData.regions || null;

            // Generate variant-specific constraint data
            variantData = {};
            const sol = gameState.solution;
            const vt = gameState.variant || 'classic';
            if (vt === 'killer') {
                const k = generateKillerCages(sol, gameState.difficulty);
                variantData.cages = k.cages;
                variantData.killerAssigned = k.assigned;
                // Killer Sudoku has NO pre-filled digits — the only information
                // is the cage sums. Blank the entire puzzle grid.
                gameState.puzzle = Array(9).fill(null).map(() => Array(9).fill(0));
            } else if (vt === 'jigsaw') {
                // Reuse the regions that the puzzle was solved against —
                // do NOT call getJigsawRegions() again here.
                variantData.regions = jigsawRegionsFromGeneration;
            } else if (vt === 'thermo') {
                variantData.thermos = generateThermos();
            } else if (vt === 'consecutive') {
                variantData.consecutivePairs = generateConsecutivePairs(sol);
            } else if (vt === 'arrow') {
                variantData.arrows = generateArrows(sol);
            } else if (vt === 'evenodd') {
                variantData.evenOddMask = generateEvenOddMask(sol);
            }
            
            gameState.claims = Array(9).fill(null).map(() => Array(9).fill(0));
            gameState.pencilMarks = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));
            
            // Mark pre-filled cells as given (claim = -1).
            // For Killer Sudoku the puzzle is blank so this loop does nothing,
            // which is correct — all cells must be filled by the player.
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (gameState.puzzle[r][c] !== 0) {
                        gameState.claims[r][c] = -1;
                    }
                }
            }
            
            gameState.timeRemaining = gameState.gameMode === 'solo' ? Infinity : (gameState.timeLimit || 600);
            gameState.p1Time = gameState.gameMode === 'solo' ? Infinity : (gameState.timeLimit || 600);
            gameState.p2Time = gameState.gameMode === 'solo' ? Infinity : (gameState.timeLimit || 600);
            gameState.dojoElapsed = 0;
            gameState.scores = { p1: 0, p2: 0 };
            gameState.totalWrongMoves = 0;
            _lastCorrectMoveTime = Date.now();
            gameState.currentPlayer = 1;
            gameState.isRunning = true;
            gameState.isPaused = false;
            gameState.selectedCell = null;
            gameState.lastMoveCell = null;
            gameState.animatingCells.clear();
            gameState.lastTick = Date.now();
            gameState.wrongMoves = 0;
            gameState.hintsUsed  = 0;
            gameState.errorCell  = null;
            gameState.highlightNumber = null;
            gameState.floatingScores  = [];
            updateWrongMovesDisplay();
            updateHintDisplay();
            
            updateTimerDisplay();
            updateScores();
            updateTurnIndicator();
            
            // Update AI indicator and opponent info
            if (gameState.vsAI) {
                const aiConfig = CONFIG.AI_DIFFICULTY[gameState.aiDifficulty];
                document.getElementById('ai-indicator').classList.add('active');
                document.getElementById('ai-diff-label').textContent = 
                    gameState.aiDifficulty.charAt(0).toUpperCase() + gameState.aiDifficulty.slice(1) + ' AI';
                document.getElementById('opponent-name').textContent = aiConfig.name;
                document.getElementById('opponent-rating').textContent = 'Rating: ' + aiConfig.rating.toFixed(1);
            } else {
                document.getElementById('ai-indicator').classList.remove('active');
                document.getElementById('opponent-name').textContent = 'Opponent';
                document.getElementById('opponent-rating').textContent = '';
            }

            // Solo/dojo mode — hide opponent panel entirely
            const opponentBar = document.querySelector('.player-bar.top');
            const turnIndicator = document.getElementById('turn-indicator');
            if (gameState.gameMode === 'solo') {
                if (opponentBar)    opponentBar.style.display = 'none';
                if (turnIndicator)  turnIndicator.style.display = 'none';
            } else {
                if (opponentBar)    opponentBar.style.display = '';
                if (turnIndicator)  turnIndicator.style.display = '';
            }
            
            lobby.style.display = 'none';
            gameScreen.classList.add('active');
            
            resizeCanvas();
            markGridDirty();
            drawGrid();
            updateRemainingCounts();
            
            requestAnimationFrame(gameLoop);
            
            if (gameState.vsAI) {
                scheduleAIMove();
            }

            // Persist immediately so "ongoing" icon appears if user leaves
            saveOngoingGame();
        }

        function resetGame() {
            gameState.isRunning = false;
            startGame();
        }

        // ============================================
        // ONGOING GAME PERSISTENCE
        // ============================================
        function saveOngoingGame() {
            // Guard: must have an actual puzzle loaded
            if (!gameState.puzzle || gameState.puzzle.length !== 9) return;
            if (!gameState.claims || gameState.claims.length !== 9) return;
            try {
                const serializedMarks = gameState.pencilMarks.map(row =>
                    row.map(cell => cell instanceof Set ? [...cell] : (cell || []))
                );
                const snapshot = {
                    puzzle:        gameState.puzzle.map(r => [...r]),
                    solution:      gameState.solution.map(r => [...r]),
                    claims:        gameState.claims.map(r => [...r]),
                    pencilMarks:   serializedMarks,
                    scores:        { ...gameState.scores },
                    p1Time:        gameState.p1Time,
                    p2Time:        gameState.p2Time,
                    timeLimit:     gameState.timeLimit,
                    timeRemaining: gameState.timeRemaining,
                    currentPlayer: gameState.currentPlayer,
                    gameMode:      gameState.gameMode,
                    vsAI:          gameState.vsAI,
                    aiDifficulty:  gameState.aiDifficulty,
                    difficulty:    gameState.difficulty,
                    wrongMoves:    gameState.wrongMoves,
                    totalWrongMoves: gameState.totalWrongMoves || 0,
                    savedAt:       Date.now(),
                    onlineRoomId:  onlineState.roomId,
                    onlineSlot:    onlineState.playerSlot,
                };
                localStorage.setItem('sudoku_ongoing_game', JSON.stringify(snapshot));
                console.log('[Ongoing] Saved game snapshot');
            } catch(e) {
                console.warn('[Ongoing] Save failed:', e);
            }
        }

        function loadOngoingGame() {
            const raw = localStorage.getItem('sudoku_ongoing_game');
            if (!raw) return null;
            try {
                const s = JSON.parse(raw);
                // Expire after 2 hours (online games can't truly resume so we still show them)
                if (Date.now() - s.savedAt > 2 * 60 * 60 * 1000) {
                    clearOngoingGame();
                    return null;
                }
                return s;
            } catch { return null; }
        }

        function clearOngoingGame() {
            localStorage.removeItem('sudoku_ongoing_game');
        }

        function resumeGame() {
            const s = loadOngoingGame();
            if (!s) return;

            // Restore game state
            gameState.puzzle       = s.puzzle.map(r => [...r]);
            gameState.solution     = s.solution.map(r => [...r]);
            gameState.claims       = s.claims.map(r => [...r]);
            gameState.pencilMarks  = s.pencilMarks.map(row =>
                row.map(cell => new Set(cell || []))
            );
            gameState.scores       = { ...s.scores };
            gameState.p1Time       = s.p1Time;
            gameState.p2Time       = s.p2Time;
            gameState.timeLimit    = s.timeLimit;
            gameState.timeRemaining = s.timeRemaining;
            gameState.currentPlayer = s.currentPlayer;
            gameState.gameMode     = s.gameMode;
            gameState.vsAI         = s.vsAI;
            gameState.aiDifficulty = s.aiDifficulty;
            gameState.difficulty   = s.difficulty;
            gameState.wrongMoves   = s.wrongMoves;
            gameState.totalWrongMoves = s.totalWrongMoves || 0;
            gameState.isRunning    = true;
            gameState.isPaused     = false;
            gameState.selectedCell = null;
            gameState.lastMoveCell = null;
            gameState.animatingCells.clear();
            gameState.lastTick     = Date.now();
            gameState.errorCell    = null;
            gameState.highlightNumber = null;
            gameState.floatingScores  = [];

            // Restore online state label if it was an online game
            if (s.onlineRoomId) {
                onlineState.roomId      = s.onlineRoomId;
                onlineState.playerSlot  = s.onlineSlot;
                document.getElementById('online-badge').classList.add('active');
            }

            updateWrongMovesDisplay();
            updateTimerDisplay();
            updateScores();
            updateTurnIndicator();

            if (gameState.vsAI) {
                const aiConfig = CONFIG.AI_DIFFICULTY[gameState.aiDifficulty];
                document.getElementById('ai-indicator').classList.add('active');
                document.getElementById('ai-diff-label').textContent =
                    gameState.aiDifficulty.charAt(0).toUpperCase() + gameState.aiDifficulty.slice(1) + ' AI';
                document.getElementById('opponent-name').textContent = aiConfig.name;
                document.getElementById('opponent-rating').textContent = 'Rating: ' + aiConfig.rating.toFixed(1);
            } else {
                document.getElementById('ai-indicator').classList.remove('active');
                document.getElementById('opponent-name').textContent = s.onlineRoomId ? 'Online Opponent' : 'Opponent';
                document.getElementById('opponent-rating').textContent = s.onlineRoomId ? 'Online' : '';
            }

            hideOngoingIcon();
            lobby.style.display = 'none';
            gameScreen.classList.add('active');
            resizeCanvas();
            markGridDirty();
            drawGrid();
            updateRemainingCounts();
            requestAnimationFrame(gameLoop);

            if (gameState.vsAI) scheduleAIMove();
            vibrate([40, 20, 80]);
        }

        function drawMiniBoard(snapshot) {
            const canvas = document.getElementById('ongoing-mini-board');
            if (!canvas) return;
            const ctx2 = canvas.getContext('2d');
            const size = 36;
            const cell = size / 9;

            // Respect the player's chosen board theme
            const theme = CONFIG.THEMES[playerData.settings.boardTheme] || CONFIG.THEMES.classic;
            const lightCell = theme.light;
            const darkCell  = theme.dark;
            const preColor  = theme.prefilled;
            const p1Color   = 'rgba(74,158,255,0.85)';
            const p2Color   = 'rgba(255,140,74,0.85)';

            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    const claim = snapshot.claims[r][c];
                    const boxR = Math.floor(r / 3);
                    const boxC = Math.floor(c / 3);
                    const isDark = (boxR + boxC) % 2 === 1;

                    if (claim === -1)       ctx2.fillStyle = preColor;
                    else if (claim === 1)   ctx2.fillStyle = p1Color;
                    else if (claim === 2)   ctx2.fillStyle = p2Color;
                    else                    ctx2.fillStyle = isDark ? darkCell : lightCell;

                    ctx2.fillRect(c * cell, r * cell, cell, cell);
                }
            }

            // 3x3 box dividers
            ctx2.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx2.lineWidth = 0.8;
            for (let i = 1; i < 9; i++) {
                ctx2.globalAlpha = i % 3 === 0 ? 0.7 : 0.25;
                ctx2.beginPath();
                ctx2.moveTo(i * cell, 0); ctx2.lineTo(i * cell, size);
                ctx2.moveTo(0, i * cell); ctx2.lineTo(size, i * cell);
                ctx2.stroke();
            }
            ctx2.globalAlpha = 1;
        }

        function showOngoingIcon(snapshot) {
            const btn = document.getElementById('ongoing-game-btn');
            if (!btn) { console.warn('[Ongoing] Button not found'); return; }
            console.log('[Ongoing] Showing icon, claims:', snapshot.claims?.length);
            drawMiniBoard(snapshot);
            btn.style.display = 'flex';
        }

        function hideOngoingIcon() {
            const btn = document.getElementById('ongoing-game-btn');
            if (btn) btn.style.display = 'none';
        }

        function checkAndShowOngoingBanner() {
            const s = loadOngoingGame();
            console.log('[Ongoing] Check:', s ? `Found (savedAt ${new Date(s.savedAt).toLocaleTimeString()})` : 'None');
            if (s) showOngoingIcon(s);
            else hideOngoingIcon();
        }

        async function resignGame() {
            if (!gameState.isRunning) return;
            // Push resign to Supabase BEFORE ending locally so opponent gets notified
            if (supabaseClient && onlineState.roomId) {
                try {
                    const { data } = await supabaseClient
                        .from('sudoku_rooms').select('state').eq('id', onlineState.roomId).single();
                    if (data) {
                        const state = { ...data.state, status: 'resigned', resignedBy: onlineState.playerSlot };
                        await supabaseClient.from('sudoku_rooms')
                            .update({ state, updated_at: new Date().toISOString() })
                            .eq('id', onlineState.roomId);
                    }
                } catch(e) { console.warn('Resign push failed:', e); }
            }
            gameState.isRunning = false;
            endGame(2, 'resign');
        }

        function goToTournamentsPage() {
            const btn = document.querySelector('[data-page="tournaments"]');
            if (btn) btn.click();
        }

        function exitToLobby() {
            // Only save as ongoing if the game is actually still running
            // (not when coming from result modal after game has ended)
            if (gameState.isRunning) {
                saveOngoingGame();
            } else {
                clearOngoingGame();
            }
            gameState.isRunning = false;
            gameScreen.classList.remove('active');
            lobby.style.display = 'block';
            checkAndShowOngoingBanner();
        }

        // ============================================
        // GAME LOOP
        // ============================================

        // Dirty flag — only redraw canvas when board state has changed,
        // OR when a continuous animation (claim pop, error flash, pulse) is active.
        let _gridDirty = false;
        function markGridDirty() { _gridDirty = true; }

        // Cache last displayed timer strings to avoid DOM writes every rAF tick
        let _lastTimerStr = { p1: '', p2: '' };

        function gameLoop() {
            if (!gameState.isRunning) return;
            
            const now = Date.now();
            const delta = (now - gameState.lastTick) / 1000;
            gameState.lastTick = now;
            
            if (!gameState.isPaused) {
                if (gameState.gameMode === 'solo') {
                    gameState.dojoElapsed = (gameState.dojoElapsed || 0) + delta;
                } else if (gameState.gameMode === 'simultaneous') {
                    gameState.timeRemaining -= delta;
                    gameState.p1Time = gameState.timeRemaining;
                    gameState.p2Time = gameState.timeRemaining;
                } else if (gameState.gameMode === 'passplay') {
                    if (gameState.currentPlayer === 1) {
                        gameState.p1Time -= delta;
                    } else {
                        gameState.p2Time -= delta;
                    }
                    gameState.timeRemaining = Math.min(gameState.p1Time, gameState.p2Time);
                } else {
                    gameState.timeRemaining -= delta;
                    gameState.p1Time = gameState.timeRemaining;
                }
                
                if (gameState.gameMode !== 'solo' && gameState.timeRemaining <= 0) {
                    gameState.timeRemaining = 0;
                    endGameByTimeout();
                    return;
                }
            }
            
            updateTimerDisplay();

            // Only repaint when something actually changed
            const hasActiveAnim = gameState.animatingCells.size > 0;
            const hasErrorFlash = !!gameState.errorCell;
            const hasPulse      = !!gameState.lastMoveCell;
            if (_gridDirty || hasActiveAnim || hasErrorFlash || hasPulse) {
                markGridDirty();
                drawGrid();
                _gridDirty = false;
            }
            
            requestAnimationFrame(gameLoop);
        }

        function updateTimerDisplay() {
            const formatTime = (s) => {
                const m = Math.floor(Math.abs(s) / 60);
                const sec = Math.floor(Math.abs(s) % 60);
                return m + ':' + (sec < 10 ? '0' : '') + sec;
            };
            const p1El = document.getElementById('p1-timer');
            const p2El = document.getElementById('p2-timer');
            if (!p1El) return;

            if (gameState.gameMode === 'solo') {
                const t = formatTime(gameState.dojoElapsed || 0);
                if (t !== _lastTimerStr.p1) { p1El.textContent = t; _lastTimerStr.p1 = t; }
                if (_lastTimerStr.p2 !== '') { p2El.textContent = ''; _lastTimerStr.p2 = ''; }
            } else {
                const t1 = formatTime(gameState.p1Time);
                const t2 = formatTime(gameState.p2Time);
                if (t1 !== _lastTimerStr.p1) { p1El.textContent = t1; _lastTimerStr.p1 = t1; }
                if (t2 !== _lastTimerStr.p2) { p2El.textContent = t2; _lastTimerStr.p2 = t2; }
                const low1 = gameState.p1Time < 30;
                const low2 = gameState.p2Time < 30;
                p1El.classList.toggle('low', low1);
                p2El.classList.toggle('low', low2);
            }
        }

        function updateScores() {
            const fmt = n => n.toLocaleString();
            const p1El = document.getElementById('p1-score');
            const p2El = document.getElementById('p2-score');
            if (p1El) {
                if (gameState.gameMode === 'solo') {
                    p1El.textContent = 'Score: ' + fmt(gameState.scores.p1);
                    // Apply clean pill styling once
                    if (!p1El._styled) {
                        Object.assign(p1El.style, {
                            background: 'linear-gradient(135deg, #1a2035 0%, #0f1628 100%)',
                            border: '1px solid rgba(74,158,255,0.35)',
                            borderRadius: '20px',
                            padding: '6px 18px',
                            fontWeight: '700',
                            fontSize: '1rem',
                            color: '#4a9eff',
                            letterSpacing: '0.3px',
                            boxShadow: '0 2px 8px rgba(74,158,255,0.15)',
                        });
                        p1El._styled = true;
                    }
                } else {
                    p1El.textContent = fmt(gameState.scores.p1);
                }
            }
            if (p2El) p2El.textContent = fmt(gameState.scores.p2);
        }

        function updateTurnIndicator() {
            const indicator = document.getElementById('turn-indicator');
            if (gameState.gameMode === 'passplay') {
                const isOnline = !!onlineState.roomId;
                if (isOnline) {
                    const myTurn = gameState.currentPlayer === onlineState.playerSlot;
                    indicator.textContent = myTurn ? 'Your Turn' : "Opponent's Turn";
                    indicator.className = 'turn-indicator visible ' + (myTurn ? 'p1-turn' : 'p2-turn');
                } else {
                    indicator.textContent = `Player ${gameState.currentPlayer}'s Turn`;
                    indicator.className = 'turn-indicator visible ' +
                        (gameState.currentPlayer === 1 ? 'p1-turn' : 'p2-turn');
                }
            } else {
                indicator.classList.remove('visible');
            }
        }

        // ============================================
        // GRID RENDERING (Chess-style)
        // ============================================
        function drawGrid() {
            const N  = gameState.gridSize || 9;
            const BS = gameState.boxSize  || 3;
            const size = canvas.width / window.devicePixelRatio;
            const cellSize = size / N;
            const now = Date.now();
            
            // ── Hoist all per-frame constants outside the cell loop ───────────
            const currentTheme   = CONFIG.THEMES[playerData.settings.boardTheme] || CONFIG.THEMES.classic;
            const useCheckerboard = currentTheme.checkerboard !== false;
            const cbMode         = playerData.settings.colorBlind || false;
            const isDarkTheme    = (currentTheme.dark === '#1a1a1a' || currentTheme.bgFill === '#161830');
            const givenCol       = currentTheme.prefilledText || (isDarkTheme ? '#e8e8e8' : '#1a1a1a');
            const p1Col          = currentTheme.playerText    || (isDarkTheme ? '#64b5f6' : '#003d80');
            const p2Col          = currentTheme.playerText    ? '#e57373' : '#8b4513';
            const numFontBig     = `bold ${Math.round(cellSize * 0.62)}px -apple-system,sans-serif`;
            const numFontSmall   = `bold ${Math.round(cellSize * 0.52)}px -apple-system,sans-serif`;
            const numFontTiny    = `bold ${Math.round(cellSize * 0.42)}px -apple-system,sans-serif`;
            const pencilFont     = `${Math.round(cellSize * 0.25)}px -apple-system,sans-serif`;
            const p1Claimed      = cbMode ? 'rgba(0,100,255,0.22)' :
                                   (useCheckerboard ? 'rgba(74,158,255,0.45)' :
                                   (isDarkTheme ? 'rgba(74,158,255,0.2)' : 'rgba(74,158,255,0.18)'));
            const p2Claimed      = cbMode ? 'rgba(220,120,0,0.22)' :
                                   (useCheckerboard ? 'rgba(255,140,74,0.45)' :
                                   (isDarkTheme ? 'rgba(255,140,74,0.2)' : 'rgba(255,140,74,0.18)'));
            const zoneTint       = useCheckerboard ? 'rgba(255,255,255,0.10)' :
                                   (!isDarkTheme ? 'rgba(199,218,255,0.45)' : 'rgba(100,130,255,0.15)');
            const gridLineColor  = currentTheme.lineColor ||
                                   (currentTheme.dark === '#1a1a1a' ? '#444' :
                                    currentTheme.dark === '#4682b4' ? '#2c5282' :
                                    currentTheme.dark === '#ff8533' ? '#cc6600' : '#5d4037');
            const boldLineColor  = currentTheme.boldLineColor ||
                                   (currentTheme.dark === '#1a1a1a' ? '#666' :
                                    currentTheme.dark === '#4682b4' ? '#1e3a5f' :
                                    currentTheme.dark === '#ff8533' ? '#994d00' : '#3e2723');

            // Clear canvas with theme background
            ctx.fillStyle = currentTheme.bgFill || currentTheme.dark;
            ctx.fillRect(0, 0, size, size);
            
            // Draw cells
            for (let row = 0; row < N; row++) {
                for (let col = 0; col < N; col++) {
                    const x = col * cellSize;
                    const y = row * cellSize;
                    const claim = gameState.claims[row][col];
                    const value = gameState.puzzle[row][col];
                    const isSelected = gameState.selectedCell && 
                                      gameState.selectedCell.row === row && 
                                      gameState.selectedCell.col === col;
                    const isLastMove = gameState.lastMoveCell &&
                                      gameState.lastMoveCell.row === row &&
                                      gameState.lastMoveCell.col === col;
                    
                    // Highlight: same row, col, or box as selected cell
                    let isHighlightZone = false;
                    let isSameNumber = false;
                    if (gameState.selectedCell) {
                        const sr = gameState.selectedCell.row;
                        const sc = gameState.selectedCell.col;
                        isHighlightZone = (row === sr || col === sc ||
                            (Math.floor(row/BS) === Math.floor(sr/BS) && Math.floor(col/BS) === Math.floor(sc/BS)));
                    }
                    // Highlight cells with same number as highlightNumber
                    if (gameState.highlightNumber && gameState.puzzle[row][col] === gameState.highlightNumber) {
                        isSameNumber = true;
                    }

                    // Error flash check
                    const isErrorCell = gameState.errorCell &&
                                       gameState.errorCell.row === row &&
                                       gameState.errorCell.col === col;
                    
                    // Cell base colour
                    let bgColor;
                    if (useCheckerboard) {
                        const isLight = (Math.floor(row / BS) + Math.floor(col / BS)) % 2 === 0;
                        bgColor = isLight ? currentTheme.light : currentTheme.dark;
                    } else {
                        bgColor = currentTheme.light;
                    }
                    
                    // Apply claim tint
                    if (claim === -1) {
                        bgColor = currentTheme.prefilled;
                    } else if (claim === 1) {
                        bgColor = p1Claimed;
                    } else if (claim === 2) {
                        bgColor = p2Claimed;
                    }
                    
                    // Animation
                    const cellKey = row * 20 + col; // numeric key — no string allocation
                    const anim = gameState.animatingCells.get(cellKey);
                    let scale = 1;
                    
                    if (anim) {
                        const elapsed = now - anim.startTime;
                        const progress = Math.min(elapsed / CONFIG.CLAIM_ANIMATION_DURATION, 1);
                        if (progress >= 1) {
                            gameState.animatingCells.delete(cellKey);
                        } else {
                            scale = 1 + Math.sin(progress * Math.PI) * (CONFIG.POP_SCALE - 1);
                        }
                    }
                    
                    // Draw cell
                    ctx.fillStyle = bgColor;
                    if (scale !== 1) {
                        const centerX = x + cellSize / 2;
                        const centerY = y + cellSize / 2;
                        const scaledSize = cellSize * scale;
                        ctx.fillRect(
                            centerX - scaledSize / 2,
                            centerY - scaledSize / 2,
                            scaledSize,
                            scaledSize
                        );
                    } else {
                        ctx.fillRect(x, y, cellSize, cellSize);
                    }

                    // Colour-blind shape overlay: P1=circle corner, P2=diagonal lines
                    if (cbMode && (claim === 1 || claim === 2)) {
                        ctx.save();
                        ctx.globalAlpha = 0.18;
                        ctx.fillStyle = claim === 1 ? '#0064ff' : '#dc7800';
                        if (claim === 1) {
                            // P1 — small circle in top-right corner
                            ctx.beginPath();
                            ctx.arc(x + cellSize*0.78, y + cellSize*0.22, cellSize*0.14, 0, Math.PI*2);
                            ctx.fill();
                        } else {
                            // P2 — small square in bottom-left corner
                            const sq = cellSize * 0.22;
                            ctx.fillRect(x + cellSize*0.08, y + cellSize*0.70, sq, sq);
                        }
                        ctx.globalAlpha = 1;
                        ctx.restore();
                    }

                    // Row/col/box highlight zone (subtle tint)
                    if (isHighlightZone && !isSelected && claim === 0) {
                        ctx.fillStyle = zoneTint;
                        ctx.fillRect(x, y, cellSize, cellSize);
                    }

                    // Same-number highlight
                    if (isSameNumber && !isSelected) {
                        ctx.fillStyle = 'rgba(245,166,35,0.25)';
                        ctx.fillRect(x, y, cellSize, cellSize);
                    }

                    // Error flash
                    if (isErrorCell) {
                        const elapsed = now - gameState.errorCell.startTime;
                        const alpha = Math.max(0, 0.6 - (elapsed / 600) * 0.6);
                        ctx.fillStyle = `rgba(240, 60, 60, ${alpha})`;
                        ctx.fillRect(x, y, cellSize, cellSize);
                    }
                    
                    // Selection highlight
                    if (isSelected) {
                        ctx.fillStyle = useCheckerboard
                            ? CONFIG.COLOR_SELECTED
                            : (currentTheme.light === '#ffffff'
                                ? 'rgba(66,133,244,0.55)'   // clean: Google-blue
                                : 'rgba(92,107,192,0.70)'); // night: indigo
                        ctx.fillRect(x, y, cellSize, cellSize);
                    }
                    
                    // Last move highlight - glowing border
                    if (isLastMove && !isSelected) {
                        // Draw a pulsing glow effect
                        const pulseIntensity = 0.5 + Math.sin(now / 500) * 0.3; // Pulse between 0.2 and 0.8
                        
                        // Outer glow
                        ctx.strokeStyle = `rgba(255, 215, 0, ${pulseIntensity * 0.6})`;
                        ctx.lineWidth = 4;
                        ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
                        
                        // Inner border
                        ctx.strokeStyle = `rgba(255, 215, 0, ${pulseIntensity})`;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
                    }
                    
                    // Last move highlight (opponent's move)
                    if (isLastMove && !isSelected) {
                        ctx.fillStyle = CONFIG.COLOR_LAST_MOVE;
                        ctx.fillRect(x, y, cellSize, cellSize);
                        
                        // Add a subtle border
                        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
                        ctx.lineWidth = 3;
                        ctx.strokeRect(x + 1.5, y + 1.5, cellSize - 3, cellSize - 3);
                    }
                    
                    // Draw number or pencil marks
                    if (value !== 0) {
                        ctx.font = N > 9 ? (value > 9 ? numFontTiny : numFontSmall) : numFontBig;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        // Colours hoisted above loop
                        if (claim === -1) {
                            ctx.fillStyle = givenCol;
                        } else if (claim === 1) {
                            ctx.fillStyle = isSelected ? '#ffffff' : p1Col;
                        } else if (claim === 2) {
                            ctx.fillStyle = isSelected ? '#ffffff' : p2Col;
                        } else {
                            ctx.fillStyle = givenCol;
                        }
                        
                        const centerX = x + cellSize / 2;
                        const centerY = y + cellSize / 2 + cellSize * 0.05;
                        
                        if (scale !== 1) {
                            ctx.save();
                            ctx.translate(centerX, centerY);
                            ctx.scale(scale, scale);
                            ctx.fillText(value.toString(), 0, 0);
                            ctx.restore();
                        } else {
                            ctx.fillText(value.toString(), centerX, centerY);
                        }
                    } else if (gameState.pencilMarks && gameState.pencilMarks[row] && gameState.pencilMarks[row][col] && gameState.pencilMarks[row][col].size > 0) {
                        // Draw pencil marks in a 3x3 grid
                        const pencilMarks = Array.from(gameState.pencilMarks[row][col]).sort();
                        ctx.font = `bold ${cellSize * 0.27}px -apple-system, sans-serif`;
                        ctx.fillStyle = '#888';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        pencilMarks.forEach(num => {
                            const pos = num - 1; // 0-8
                            const pencilRow = Math.floor(pos / 3);
                            const pencilCol = pos % 3;
                            const pencilX = x + (pencilCol + 0.5) * (cellSize / 3);
                            const pencilY = y + (pencilRow + 0.5) * (cellSize / 3);
                            ctx.fillText(num.toString(), pencilX, pencilY);
                        });
                    }
                }
            }
            
            // ── Grid Lines — batched into single paths per weight ───────────
            // Thin cell dividers (one path for all)
            ctx.strokeStyle = gridLineColor;
            ctx.lineWidth = N > 9 ? 0.5 : 0.8;
            ctx.beginPath();
            for (let i = 0; i <= N; i++) {
                const pos = i * cellSize;
                ctx.moveTo(pos, 0); ctx.lineTo(pos, size);
                ctx.moveTo(0, pos); ctx.lineTo(size, pos);
            }
            ctx.stroke();
            // Bold box dividers (one path for all)
            ctx.strokeStyle = boldLineColor;
            ctx.lineWidth = N > 9 ? 1.5 : 2.5;
            const boxes = N / BS;
            ctx.beginPath();
            for (let i = 0; i <= boxes; i++) {
                const pos = i * BS * cellSize;
                ctx.moveTo(pos, 0); ctx.lineTo(pos, size);
                ctx.moveTo(0, pos); ctx.lineTo(size, pos);
            }
            ctx.stroke();
            // Outer border
            ctx.strokeStyle = currentTheme.outerBorderColor || boldLineColor;
            ctx.lineWidth = N > 9 ? 2.5 : 3.5;
            ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

            // ── VARIANT OVERLAYS ────────────────────────────────────
            const variant = gameState.variant || 'classic';
            // Variants are only defined for standard 9×9
            if (N !== 9) return; // no overlay for 16×16

            // DIAGONAL
            if (variant === 'diagonal') {
                ctx.save();
                ctx.globalAlpha = 0.10; ctx.fillStyle = '#d59020';
                for (let i=0;i<9;i++) ctx.fillRect(i*cellSize, i*cellSize, cellSize, cellSize);
                for (let i=0;i<9;i++) ctx.fillRect((8-i)*cellSize, i*cellSize, cellSize, cellSize);
                ctx.globalAlpha = 1;
                ctx.strokeStyle = 'rgba(213,144,32,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([4,3]);
                ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(size,size);
                ctx.moveTo(size,0); ctx.lineTo(0,size); ctx.stroke();
                ctx.setLineDash([]); ctx.restore();
            }

            // WINDOKU
            if (variant === 'windoku') {
                ctx.save(); ctx.globalAlpha = 0.10; ctx.fillStyle = '#7c6fcd';
                const wins = [[1,1],[1,5],[5,1],[5,5]];
                for (const [wr,wc] of wins)
                    for (let r=wr;r<wr+3;r++) for (let c=wc;c<wc+3;c++)
                        ctx.fillRect(c*cellSize, r*cellSize, cellSize, cellSize);
                ctx.globalAlpha = 1;
                ctx.strokeStyle = 'rgba(124,111,205,0.5)'; ctx.lineWidth = 2;
                for (const [wr,wc] of wins)
                    ctx.strokeRect(wc*cellSize+1, wr*cellSize+1, cellSize*3-2, cellSize*3-2);
                ctx.restore();
            }

            // ANTI-KNIGHT — highlight forbidden cells for selected cell
            if (variant === 'antiknight' && gameState.selectedCell) {
                const {row:sr,col:sc} = gameState.selectedCell;
                const km=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
                ctx.save(); ctx.fillStyle = 'rgba(255,80,80,0.14)';
                for (const [dr,dc] of km) {
                    const nr=sr+dr, nc=sc+dc;
                    if (nr>=0&&nr<9&&nc>=0&&nc<9) ctx.fillRect(nc*cellSize, nr*cellSize, cellSize, cellSize);
                }
                ctx.restore();
            }

            // KILLER — dashed cage borders + sum labels
            if (variant === 'killer' && variantData.cages && variantData.killerAssigned) {
                const asgn = variantData.killerAssigned;
                ctx.save();
                // Draw dashed cage borders (inset by 2px so lines don't overlap grid lines)
                ctx.strokeStyle = 'rgba(213,144,32,0.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
                const pad = 2;
                for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
                    const id=asgn[r][c], x=c*cellSize, y=r*cellSize;
                    if (r===0||asgn[r-1][c]!==id){ctx.beginPath();ctx.moveTo(x+pad,y+pad);ctx.lineTo(x+cellSize-pad,y+pad);ctx.stroke();}
                    if (r===8||asgn[r+1][c]!==id){ctx.beginPath();ctx.moveTo(x+pad,y+cellSize-pad);ctx.lineTo(x+cellSize-pad,y+cellSize-pad);ctx.stroke();}
                    if (c===0||asgn[r][c-1]!==id){ctx.beginPath();ctx.moveTo(x+pad,y+pad);ctx.lineTo(x+pad,y+cellSize-pad);ctx.stroke();}
                    if (c===8||asgn[r][c+1]!==id){ctx.beginPath();ctx.moveTo(x+cellSize-pad,y+pad);ctx.lineTo(x+cellSize-pad,y+cellSize-pad);ctx.stroke();}
                }
                ctx.setLineDash([]);
                // Draw cage sum in top-left cell of each cage, with a subtle pill background
                const sumFontSize = Math.max(9, Math.round(cellSize * 0.24));
                ctx.font = `bold ${sumFontSize}px -apple-system,sans-serif`;
                ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                for (const cage of variantData.cages) {
                    // Top-left-most cell (lowest row, then lowest col)
                    const [tr, tc] = cage.cells.reduce(([mr,mc],[r,c])=>r<mr||(r===mr&&c<mc)?[r,c]:[mr,mc]);
                    const label = String(cage.sum);
                    const lx = tc * cellSize + 4;
                    const ly = tr * cellSize + 3;
                    // Tiny background pill for legibility
                    const tw = ctx.measureText(label).width;
                    ctx.fillStyle = 'rgba(0,0,0,0.32)';
                    ctx.beginPath();
                    const rr2 = 2;
                    ctx.roundRect(lx - 1, ly - 1, tw + 4, sumFontSize + 2, rr2);
                    ctx.fill();
                    ctx.fillStyle = '#f5c842';
                    ctx.fillText(label, lx, ly);
                }
                ctx.restore();
            }

            // JIGSAW — colored region shading + thick borders between regions
            if (variant === 'jigsaw' && variantData.regions) {
                const reg = variantData.regions;
                const regionFill = [
                    'rgba(213,144,32,0.12)','rgba(74,158,255,0.12)','rgba(86,211,100,0.12)',
                    'rgba(255,140,74,0.12)','rgba(180,100,220,0.12)','rgba(240,90,90,0.12)',
                    'rgba(255,220,80,0.12)','rgba(80,200,180,0.12)','rgba(150,150,255,0.12)',
                ];
                const regionBorder = [
                    'rgba(213,144,32,0.7)','rgba(74,158,255,0.7)','rgba(86,211,100,0.7)',
                    'rgba(255,140,74,0.7)','rgba(180,100,220,0.7)','rgba(240,90,90,0.7)',
                    'rgba(255,220,80,0.7)','rgba(80,200,180,0.7)','rgba(150,150,255,0.7)',
                ];
                ctx.save();
                for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
                    ctx.fillStyle = regionFill[reg[r][c]%9];
                    ctx.fillRect(c*cellSize, r*cellSize, cellSize, cellSize);
                }
                ctx.lineWidth = 2.5;
                for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
                    const id=reg[r][c], x=c*cellSize, y=r*cellSize;
                    ctx.strokeStyle = regionBorder[id%9];
                    if (r===0||reg[r-1][c]!==id){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+cellSize,y);ctx.stroke();}
                    if (r===8||reg[r+1][c]!==id){ctx.beginPath();ctx.moveTo(x,y+cellSize);ctx.lineTo(x+cellSize,y+cellSize);ctx.stroke();}
                    if (c===0||reg[r][c-1]!==id){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+cellSize);ctx.stroke();}
                    if (c===8||reg[r][c+1]!==id){ctx.beginPath();ctx.moveTo(x+cellSize,y);ctx.lineTo(x+cellSize,y+cellSize);ctx.stroke();}
                }
                ctx.restore();
            }

            // THERMO — grey tubes + filled bulb at start
            if (variant === 'thermo' && variantData.thermos) {
                ctx.save();
                for (const thermo of variantData.thermos) {
                    ctx.strokeStyle = 'rgba(190,190,190,0.4)';
                    ctx.lineWidth = cellSize*0.32; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                    ctx.beginPath();
                    for (let i=0;i<thermo.length;i++) {
                        const [r,c]=thermo[i], x=c*cellSize+cellSize/2, y=r*cellSize+cellSize/2;
                        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
                    }
                    ctx.stroke();
                    const [br2,bc2]=thermo[0];
                    ctx.fillStyle='rgba(190,190,190,0.55)';
                    ctx.beginPath();
                    ctx.arc(bc2*cellSize+cellSize/2, br2*cellSize+cellSize/2, cellSize*0.3, 0, Math.PI*2);
                    ctx.fill();
                }
                ctx.restore();
            }

            // CONSECUTIVE — white bar between pairs that must be consecutive
            if (variant === 'consecutive' && variantData.consecutivePairs) {
                ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.75)';
                for (const p of variantData.consecutivePairs) {
                    const mx=((p.c1+p.c2)/2+0.5)*cellSize, my=((p.r1+p.r2)/2+0.5)*cellSize;
                    const bw=p.r1===p.r2?4:cellSize*0.5, bh=p.r1===p.r2?cellSize*0.5:4;
                    ctx.fillRect(mx-bw/2, my-bh/2, bw, bh);
                }
                ctx.restore();
            }

            // ARROW — shaft from circle + arrowhead
            if (variant === 'arrow' && variantData.arrows) {
                ctx.save();
                for (const arrow of variantData.arrows) {
                    const [cr,cc]=arrow.circle;
                    ctx.strokeStyle='rgba(180,180,180,0.5)';
                    ctx.lineWidth=cellSize*0.12; ctx.lineCap='round';
                    ctx.beginPath();
                    ctx.moveTo(cc*cellSize+cellSize/2, cr*cellSize+cellSize/2);
                    for (const [r,c] of arrow.cells) ctx.lineTo(c*cellSize+cellSize/2, r*cellSize+cellSize/2);
                    ctx.stroke();
                    ctx.strokeStyle='rgba(180,180,180,0.65)'; ctx.lineWidth=1.5;
                    ctx.beginPath();
                    ctx.arc(cc*cellSize+cellSize/2, cr*cellSize+cellSize/2, cellSize*0.34, 0, Math.PI*2);
                    ctx.stroke();
                    const last=arrow.cells[arrow.cells.length-1];
                    const prev2=arrow.cells.length>1?arrow.cells[arrow.cells.length-2]:arrow.circle;
                    const angle=Math.atan2(last[0]-prev2[0], last[1]-prev2[1]);
                    const ax=last[1]*cellSize+cellSize/2, ay=last[0]*cellSize+cellSize/2;
                    ctx.fillStyle='rgba(180,180,180,0.6)';
                    ctx.beginPath();
                    ctx.moveTo(ax+Math.cos(angle)*cellSize*0.2, ay+Math.sin(angle)*cellSize*0.2);
                    ctx.lineTo(ax+Math.cos(angle-2.5)*cellSize*0.13, ay+Math.sin(angle-2.5)*cellSize*0.13);
                    ctx.lineTo(ax+Math.cos(angle+2.5)*cellSize*0.13, ay+Math.sin(angle+2.5)*cellSize*0.13);
                    ctx.closePath(); ctx.fill();
                }
                ctx.restore();
            }

            // EVEN-ODD — circle=even, rounded-square=odd
            if (variant === 'evenodd' && variantData.evenOddMask) {
                ctx.save();
                for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
                    const m=variantData.evenOddMask[r][c]; if(!m) continue;
                    const x=c*cellSize, y=r*cellSize, pd=cellSize*0.1;
                    ctx.fillStyle='rgba(140,140,160,0.25)';
                    if (m==='even') {
                        ctx.beginPath();
                        ctx.arc(x+cellSize/2, y+cellSize/2, cellSize*0.38, 0, Math.PI*2);
                        ctx.fill();
                    } else {
                        ctx.fillRect(x+pd, y+pd, cellSize-pd*2, cellSize-pd*2);
                    }
                }
                ctx.restore();
            }
        }

        // ============================================
        // INPUT HANDLING
        // ============================================
        function handleCanvasClick(e) {
            if (!gameState.isRunning) return;
            // Allow clicking in pencil mode even during opponent's turn
            // if (gameState.gameMode === 'passplay' && gameState.currentPlayer !== 1) return;
            
            const rect = canvas.getBoundingClientRect();
            selectCell(e.clientX - rect.left, e.clientY - rect.top);
        }

        function handleTouch(e) {
            if (!gameState.isRunning) return;
            // Allow touching in pencil mode even during opponent's turn
            // if (gameState.gameMode === 'passplay' && gameState.currentPlayer !== 1) return;
            
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            selectCell(touch.clientX - rect.left, touch.clientY - rect.top);
        }

        function selectCell(x, y) {
            const size = canvas.width / window.devicePixelRatio;
            const cellSize = size / (gameState.gridSize || 9);
            
            const col = Math.floor(x / cellSize);
            const row = Math.floor(y / cellSize);
            
            const _N = gameState.gridSize || 9;
            if (row < 0 || row >= _N || col < 0 || col >= _N) return;

            // Always allow selecting any cell — pre-filled and claimed cells can be
            // selected to trigger the "highlight matching numbers" visual, even though
            // input will be blocked in makeMove/handleNumberInput for those cells.
            gameState.selectedCell = { row, col };
            gameState.highlightNumber = gameState.puzzle[row][col] || null;
            markGridDirty();
            drawGrid();
            // No longer showing the popup picker - permanent pad is always visible
        }

        function showNumberPicker() {
            // Deprecated - keeping for compatibility
        }

        function hideNumberPicker() {
            // Deprecated - keeping for compatibility
            gameState.selectedCell = null;
            markGridDirty(); drawGrid();
        }

        // ============================================
        // GAME LOGIC
        // ============================================
        function makeMove(number) {
            if (!gameState.selectedCell) return;
            
            const { row, col } = gameState.selectedCell;
            if (gameState.claims[row][col] !== 0) return;

            // Wrong move handling
            if (gameState.solution[row][col] !== number) {
                // Register wrong move
                gameState.wrongMoves++;
                gameState.totalWrongMoves++;
                gameState.errorCell = { row, col, startTime: Date.now() };

                // Penalty: lose 10 seconds of time (not applicable in untimed solo mode)
                const PENALTY_SECONDS = 10;
                if (gameState.gameMode === 'simultaneous') {
                    gameState.timeRemaining = Math.max(0, gameState.timeRemaining - PENALTY_SECONDS);
                    gameState.p1Time = gameState.timeRemaining;
                    gameState.p2Time = gameState.timeRemaining;
                } else if (gameState.gameMode === 'passplay') {
                    gameState.p1Time = Math.max(0, gameState.p1Time - PENALTY_SECONDS);
                }
                // solo mode is untimed (dojoElapsed counts up) — no time penalty applied

                // Show penalty toast
                showPenaltyToast(PENALTY_SECONDS);

                // Play error sound
                playSound('error');

                // 3 wrong moves → deduct 500 points (if any) and show warning
                if (gameState.wrongMoves >= gameState.maxWrongMoves) {
                    const deduct = 500;
                    gameState.scores.p1 = Math.max(0, gameState.scores.p1 - deduct);
                    _lastCorrectMoveTime = 0; // reset speed bonus as punishment
                    updateScores();
                    spawnFloatingScore(row, col, '-500', '#f05a5a');
                    gameState.wrongMoves = 0; // reset counter after penalty
                }

                updateWrongMovesDisplay();
                markGridDirty();
                drawGrid();
                // Auto-clear error flash after 600ms
                setTimeout(() => {
                    gameState.errorCell = null;
                    markGridDirty();
                    drawGrid();
                }, 600);
                return;
            }
            
            const player = gameState.gameMode === 'passplay' ? gameState.currentPlayer : 1;
            
            // ── Speed-based scoring (mirrors reference app) ──────────────
            // Base: 200 pts per cell. Speed bonus: up to +300 if placed in <5s,
            // scaling down to 0 bonus after 30s since last correct move.
            let pointsEarned = 200;
            if (gameState.gameMode === 'solo') {
                const now_ = Date.now();
                const secSinceLast = (now_ - _lastCorrectMoveTime) / 1000;
                const speedBonus = Math.round(Math.max(0, 300 * (1 - secSinceLast / 30)));
                pointsEarned = 200 + speedBonus;
                _lastCorrectMoveTime = now_;
            }
            gameState.scores.p1 += pointsEarned;

            // Clear pencil marks from this cell
            if (gameState.pencilMarks && gameState.pencilMarks[row] && gameState.pencilMarks[row][col]) {
                gameState.pencilMarks[row][col].clear();
            }

            // ── Auto-clear pencil marks of the same number in row/col/box ──
            const BS_ = gameState.boxSize || 3;
            const N_ = gameState.gridSize || 9;
            const boxR = Math.floor(row / BS_) * BS_;
            const boxC = Math.floor(col / BS_) * BS_;
            for (let i = 0; i < N_; i++) {
                // Same row
                if (gameState.pencilMarks[row] && gameState.pencilMarks[row][i])
                    gameState.pencilMarks[row][i].delete(number);
                // Same col
                if (gameState.pencilMarks[i] && gameState.pencilMarks[i][col])
                    gameState.pencilMarks[i][col].delete(number);
            }
            // Same box
            for (let br = boxR; br < boxR + BS_; br++)
                for (let bc = boxC; bc < boxC + BS_; bc++)
                    if (gameState.pencilMarks[br] && gameState.pencilMarks[br][bc])
                        gameState.pencilMarks[br][bc].delete(number);

            // Highlight the placed number
            gameState.highlightNumber = number;
            
            claimCell(row, col, number, player);
            updateRemainingCounts();

            // Spawn points float
            const floatLabel = pointsEarned > 0 ? '+' + pointsEarned.toLocaleString() : '+200';
            spawnFloatingScore(row, col, floatLabel, player === 1 ? '#4a9eff' : '#ff8c4a');
            
            if (gameState.gameMode === 'passplay') {
                gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
                updateTurnIndicator();
                
                // If vs AI and it's now AI's turn, trigger AI move
                if (gameState.vsAI && gameState.currentPlayer === 2) {
                    scheduleAIMove();
                }
            }
            
            checkGameEnd();
        }

        // ============================================
        // WRONG MOVE HELPERS
        // ============================================
        function showPenaltyToast(seconds) {
            let toast = document.getElementById('penalty-toast');
            if (!toast) return;
            // In solo mode (no time limit) show a points-based message
            if (gameState.gameMode === 'solo') {
                const isFinalPenalty = gameState.wrongMoves >= gameState.maxWrongMoves;
                toast.textContent = isFinalPenalty ? '⚠ 3 mistakes! −500 pts' : `⚠ Wrong move! (${gameState.wrongMoves}/${gameState.maxWrongMoves})`;
            } else {
                toast.textContent = `⚠ Wrong move! −${seconds}s`;
            }
            toast.classList.remove('show');
            void toast.offsetWidth;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        }

        function showToast(message, duration = 2000) {
            let toast = document.getElementById('penalty-toast');
            if (!toast) return;
            toast.textContent = message;
            toast.classList.remove('show');
            void toast.offsetWidth;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), duration);
        }

        function updateWrongMovesDisplay() {
            const el = document.getElementById('wrong-moves-display');
            if (!el) return;
            const strikes = '●'.repeat(gameState.wrongMoves) + '○'.repeat(gameState.maxWrongMoves - gameState.wrongMoves);
            el.textContent = strikes;
            // Turn orange at first mistake, red at second+ (matches reference app)
            el.style.color = gameState.wrongMoves >= 2 ? '#f05a5a' : gameState.wrongMoves >= 1 ? '#f5a623' : '#5a5a7a';
        }

        function spawnFloatingScore(row, col, text, color) {
            const size = canvas.width / window.devicePixelRatio;
            const cellSize = size / (gameState.gridSize || 9);
            const rect = canvas.getBoundingClientRect();
            const x = rect.left + col * cellSize + cellSize / 2;
            const y = rect.top + row * cellSize + cellSize / 2;

            const el = document.createElement('div');
            el.textContent = text;
            el.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                transform: translate(-50%, -50%);
                font-size: 1.4rem;
                font-weight: 800;
                color: ${color};
                pointer-events: none;
                z-index: 9999;
                text-shadow: 0 2px 8px rgba(0,0,0,0.7);
                animation: floatUp 0.9s ease-out forwards;
            `;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 900);
        }

        function handleKeyDown(e) {
            if (!gameState.isRunning) return;

            // Number keys 1-9
            if (e.key >= '1' && e.key <= '9') {
                const num = parseInt(e.key);
                const btn = document.querySelector(`.num-pad-btn[data-num="${num}"]`);
                if (btn && !btn.classList.contains('disabled')) {
                    handleNumberInput(num);
                    gameState.highlightNumber = num;
                }
                return;
            }

            // Arrow keys to move selected cell
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const _GS2 = gameState.gridSize || 9;
                const midCell = Math.floor(_GS2 / 2);
                let { row, col } = gameState.selectedCell || { row: midCell, col: midCell };
                let dr = 0, dc = 0;
                if (e.key === 'ArrowUp')    dr = -1;
                if (e.key === 'ArrowDown')  dr =  1;
                if (e.key === 'ArrowLeft')  dc = -1;
                if (e.key === 'ArrowRight') dc =  1;

                let nr = row + dr, nc = col + dc;
                while (nr >= 0 && nr < _GS2 && nc >= 0 && nc < _GS2) {
                    if (gameState.claims[nr][nc] !== -1) {
                        gameState.selectedCell = { row: nr, col: nc };
                        gameState.highlightNumber = gameState.puzzle[nr][nc] || null;
                        break;
                    }
                    nr += dr; nc += dc;
                }
                markGridDirty();
                drawGrid();
                return;
            }

            // Escape to deselect
            if (e.key === 'Escape') {
                gameState.selectedCell = null;
                gameState.highlightNumber = null;
                markGridDirty();
                drawGrid();
            }

            // P for pencil mode toggle
            if (e.key === 'p' || e.key === 'P') {
                const pencilBtn = document.getElementById('pencil-mode-btn');
                if (pencilBtn) pencilBtn.click();
            }
        }

        function playSound(type) {
            if (!playerData.settings.soundEnabled) return;
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                if (type === 'error') {
                    osc.frequency.setValueAtTime(220, ctx.currentTime);
                    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.15);
                    gain.gain.setValueAtTime(0.3, ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.15);
                } else if (type === 'claim') {
                    osc.frequency.setValueAtTime(440, ctx.currentTime);
                    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.1);
                    gain.gain.setValueAtTime(0.2, ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.1);
                }
            } catch(e) { /* audio not supported */ }
        }

        function claimCell(row, col, number, player) {
            gameState.puzzle[row][col] = number;
            gameState.claims[row][col] = player;
            
            // Track last move if it's the opponent (player 2)
            if (player === 2) {
                gameState.lastMoveCell = { row, col };
                showOpponentMoveNotification();
            } else {
                // Clear last move highlight when player 1 makes a move
                gameState.lastMoveCell = null;
            }
            
            if (player === 1) {
                gameState.scores.p1++;
            } else {
                gameState.scores.p2++;
            }
            
            gameState.animatingCells.set(row * 20 + col, {
                startTime: Date.now(),
                player: player
            });
            
            playSound('claim');
            updateScores();
            markGridDirty(); drawGrid();
        }

        function showOpponentMoveNotification() {
            const indicator = document.getElementById('move-indicator');
            if (!indicator || !gameState.lastMoveCell) return;
            
            // Update text to show the move
            const row = gameState.lastMoveCell.row;
            const col = gameState.lastMoveCell.col;
            const number = gameState.puzzle[row][col];
            const rowLabel = String.fromCharCode(65 + row); // A-I
            const colLabel = col + 1; // 1-9
            
            indicator.textContent = `Opponent played ${number} at ${rowLabel}${colLabel}!`;
            
            // Remove any existing animation
            indicator.classList.remove('show');
            
            // Trigger reflow to restart animation
            void indicator.offsetWidth;
            
            // Add the animation class
            indicator.classList.add('show');
            
            // Remove the class after animation completes
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 2000);
        }

        function checkGameEnd() {
            const _GN = gameState.gridSize || 9;
            let isFull = true;
            outer_cge: for (let r = 0; r < _GN; r++) {
                for (let c = 0; c < _GN; c++) {
                    if (gameState.claims[r][c] === 0) { isFull = false; break outer_cge; }
                }
            }
            if (!isFull) return;
            if (gameState.gameMode === 'solo') { endGame(1, 'solved'); return; }
            endGameByCells();
        }

        function endGameByTimeout() {
            if (gameState.gameMode === 'solo') return; // solo is untimed
            if (gameState.gameMode === 'passplay') {
                endGame(gameState.p1Time <= 0 ? 2 : 1, 'timeout');
            } else {
                endGameByCells();
            }
        }

        function endGameByCells() {
            if (gameState.scores.p1 > gameState.scores.p2) {
                endGame(1, 'cells');
            } else if (gameState.scores.p2 > gameState.scores.p1) {
                endGame(2, 'cells');
            } else {
                // Tie in cells - player with more time wins
                if (gameState.p1Time > gameState.p2Time) {
                    endGame(1, 'time');
                } else if (gameState.p2Time > gameState.p1Time) {
                    endGame(2, 'time');
                } else {
                    endGame(0, 'draw');
                }
            }
        }

        function endGame(winner, reason) {
            gameState.isRunning = false;
            
            const oldRating = playerRating;
            let ratingChange = 0;
            let result = winner === 1 ? 'win' : winner === 2 ? 'loss' : 'draw';
            
            // Only change rating for real online games (not AI, not local)
            const isRatedGame = gameState.gameMode !== 'solo'
                && !gameState.vsAI
                && onlineState.roomId;

            if (isRatedGame) {
                // Use the opponent's real rating if it was stored in the room state;
                // fall back to the midpoint of the rating scale as a neutral estimate.
                const opponentRating = onlineState._opponentRating ?? 3.0;
                if (result === 'win') {
                    const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 2));
                    ratingChange = Math.max(0.1, Math.min(0.4, 0.4 * (1 - expected)));
                } else if (result === 'loss') {
                    const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 2));
                    ratingChange = Math.min(-0.1, Math.max(-0.4, -0.4 * expected));
                } else {
                    ratingChange = 0.05;
                }
                playerRating = Math.max(CONFIG.MIN_RATING,
                    Math.min(CONFIG.MAX_RATING, playerRating + ratingChange));
                saveRating();
            }

            // Always record the game and update daily streak
            const opponentName = gameState.vsAI
                ? CONFIG.AI_DIFFICULTY[gameState.aiDifficulty].name
                : onlineState.roomId ? 'Online Opponent' : 'Local';
            recordGame(result, opponentName);
            
            showResultModal(winner, reason, ratingChange, oldRating);
        }

        function showResultModal(winner, reason, ratingChange, oldRating) {
            const modal   = document.getElementById('result-modal');
            const icon    = document.getElementById('result-icon');
            const title   = document.getElementById('result-title');
            const subtitle= document.getElementById('result-subtitle');
            const grid    = document.getElementById('result-stats-grid');
            const ratingWrap = document.getElementById('rating-change').parentElement;

            if (gameState.gameMode === 'solo') {
                // ── Solo mode ──────────────────────────────────────────
                const solved = reason === 'solved';
                const elapsed = Math.round(gameState.dojoElapsed || 0);
                const mins = Math.floor(elapsed / 60), secs = elapsed % 60;
                const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

                const isDaily = gameState.isDailyChallenge;
                icon.textContent  = solved ? (isDaily ? '📅' : '🎉') : '🤔';
                title.textContent = solved ? (isDaily ? 'Daily Challenge Complete!' : 'Puzzle Complete!') : 'Keep Going!';
                subtitle.textContent = solved ? `Solved in \${timeStr}` : `Time elapsed: \${timeStr}`;

                // Best time tracking
                const diff = gameState.difficulty || 'medium';
                let bestTimeStr = '—';
                if (solved) {
                    const prev = (playerData.soloStats[diff] || {});
                    const prevBest = prev.bestTime;
                    const isNewBest = !prevBest || elapsed < prevBest;
                    const finalScore = gameState.scores.p1;
                    const prevBestScore = prev.bestScore || 0;
                    const isNewBestScore = finalScore > prevBestScore;
                    playerData.soloStats[diff] = {
                        ...(playerData.soloStats[diff] || {}),
                        bestTime: isNewBest ? elapsed : prevBest,
                        bestScore: isNewBestScore ? finalScore : prevBestScore,
                        gamesPlayed: (prev.gamesPlayed || 0) + 1,
                    };
                    savePlayerData();
                    if (isNewBest && prevBest) {
                        const pb = prevBest;
                        bestTimeStr = `🏅 New best! (was ${Math.floor(pb/60)}m ${pb%60}s)`;
                    } else if (isNewBest) {
                        bestTimeStr = '🏅 First solve!';
                    } else {
                        const pb = playerData.soloStats[diff].bestTime;
                        bestTimeStr = `Best: ${Math.floor(pb/60)}m ${pb%60}s`;
                    }
                }

                // Build compact 2-column stats grid
                const maxHints = { easy: 5, medium: 3, hard: 1, extreme: 0 }[diff] ?? 3;
                const finalScore = gameState.scores.p1;
                grid.style.display = 'grid';
                grid.style.gridTemplateColumns = '1fr 1fr';
                grid.innerHTML = `
                    <div class="result-stat" style="border-color:var(--border-color);grid-column:1/-1;">
                        <div class="result-stat-value" style="font-size:2rem;color:var(--accent-blue);">${finalScore.toLocaleString()}</div>
                        <div class="result-stat-label">Score</div>
                    </div>
                    <div class="result-stat" style="border-color:var(--border-color);">
                        <div class="result-stat-value" style="font-size:1.3rem;">${timeStr}</div>
                        <div class="result-stat-label">Time</div>
                    </div>
                    <div class="result-stat" style="border-color:var(--border-color);">
                        <div class="result-stat-value" style="font-size:1.3rem;">${gameState.totalWrongMoves ?? 0}</div>
                        <div class="result-stat-label">Mistakes</div>
                    </div>
                    <div class="result-stat" style="border-color:var(--border-color);">
                        <div class="result-stat-value" style="font-size:1.3rem;">${gameState.hintsUsed || 0}</div>
                        <div class="result-stat-label">Hints Used</div>
                    </div>
                    <div class="result-stat" style="border-color:var(--border-color);">
                        <div class="result-stat-value" style="font-size:0.85rem;color:var(--accent-orange);">${bestTimeStr}</div>
                        <div class="result-stat-label">Personal Best</div>
                    </div>`;

                ratingWrap.style.display = 'none';

                if (gameState.isDailyChallenge && solved) {
                    markChallengeDoneToday(finalScore, elapsed);
                    recordDailyGame(); // also counts for streak
                    gameState.isDailyChallenge = false;
                    // Update daily challenge label in lobby if visible
                    const dcBtn = document.getElementById('daily-challenge-lobby-btn');
                    if (dcBtn) {
                        dcBtn.innerHTML = dcBtn.innerHTML.replace("Play Today's Challenge", '✅ Done for today!');
                        dcBtn.style.opacity = '0.6';
                    }
                }
                if (gameState.dojoTechniqueId && solved) {
                    completeDojoPuzzle();
                }

            } else {
                // ── PvP mode ───────────────────────────────────────────
                grid.style.display = 'grid';
                grid.style.gridTemplateColumns = '1fr 1fr';
                grid.innerHTML = `
                    <div class="result-stat p1">
                        <div class="result-stat-value">${gameState.scores.p1}</div>
                        <div class="result-stat-label">Your Cells</div>
                    </div>
                    <div class="result-stat p2">
                        <div class="result-stat-value">${gameState.scores.p2}</div>
                        <div class="result-stat-label">Opponent</div>
                    </div>`;

                // Rating display
                document.getElementById('old-rating').textContent = oldRating.toFixed(1);
                document.getElementById('new-rating').textContent = playerRating.toFixed(1);
                const deltaEl = document.getElementById('rating-delta');
                if (ratingChange > 0) {
                    deltaEl.textContent = `(+${ratingChange.toFixed(1)})`;
                    document.getElementById('rating-change').className = 'rating-change positive';
                } else if (ratingChange < 0) {
                    deltaEl.textContent = `(${ratingChange.toFixed(1)})`;
                    document.getElementById('rating-change').className = 'rating-change negative';
                } else {
                    deltaEl.textContent = '(+0.0)';
                    document.getElementById('rating-change').className = 'rating-change';
                }
                ratingWrap.style.display = 'block';

                if (winner === 1) {
                    icon.textContent  = '🏆';
                    title.textContent = 'You Win!';
                    subtitle.textContent = reason === 'resign'  ? 'Opponent resigned' :
                                          reason === 'timeout' ? 'Opponent ran out of time' :
                                          reason === 'time'    ? 'More time remaining' :
                                          'Most cells claimed';
                } else if (winner === 2) {
                    icon.textContent  = '😔';
                    title.textContent = 'You Lose';
                    subtitle.textContent = reason === 'resign'  ? 'You resigned' :
                                          reason === 'timeout' ? 'You ran out of time' :
                                          reason === 'time'    ? 'Opponent had more time' :
                                          'Opponent claimed more cells';
                } else {
                    icon.textContent  = '🤝';
                    title.textContent = 'Draw!';
                    subtitle.textContent = 'Equal cells claimed';
                }
            }

            modal.classList.add('active');
        }

        // ============================================
        // AI OPPONENT
        // ============================================
        let aiTimeout = null;

        function scheduleAIMove() {
            if (!gameState.isRunning || !gameState.vsAI) return;
            
            // Cancel any already-pending AI move before scheduling another,
            // preventing two parallel timers if scheduleAIMove is called from
            // multiple places (resume, pass & play switch, etc.).
            clearTimeout(aiTimeout);
            aiTimeout = null;

            const aiConfig = CONFIG.AI_DIFFICULTY[gameState.aiDifficulty];
            
            // Calculate delay based on AI's remaining time
            const aiTime = gameState.gameMode === 'passplay' ? gameState.p2Time : gameState.timeRemaining;
            
            // Base delay is a percentage of remaining time, with absolute min/max bounds
            const baseDelay = aiTime * 1000; // Convert to milliseconds
            const minDelay = Math.max(2000, baseDelay * aiConfig.baseMinDelay); // At least 2 seconds
            const maxDelay = Math.max(3000, baseDelay * aiConfig.baseMaxDelay); // At least 3 seconds
            
            const delay = minDelay + Math.random() * (maxDelay - minDelay);
            
            aiTimeout = setTimeout(makeAIMove, delay);
        }

        function makeAIMove() {
            aiTimeout = null; // mark as consumed so scheduleAIMove sees a clean slate
            if (!gameState.isRunning || !gameState.vsAI) return;
            
            // In Pass & Play mode, AI should only move on its turn (Player 2)
            if (gameState.gameMode === 'passplay' && gameState.currentPlayer !== 2) {
                // Not AI's turn - wait and check again later
                scheduleAIMove();
                return;
            }
            
            const aiConfig = CONFIG.AI_DIFFICULTY[gameState.aiDifficulty];
            const emptyCells = [];
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (gameState.claims[r][c] === 0) {
                        emptyCells.push({ row: r, col: c });
                    }
                }
            }
            
            if (emptyCells.length === 0) return;
            
            let move = null;
            
            // Check if AI should make a mistake
            if (Math.random() < aiConfig.mistakeChance) {
                // Make a random invalid move (skip turn essentially)
                scheduleAIMove();
                return;
            }
            
            // Find obvious singles
            const obviousMoves = [];
            for (const cell of emptyCells) {
                const validNumbers = getValidNumbers(cell.row, cell.col);
                if (validNumbers.length === 1) {
                    obviousMoves.push({ ...cell, number: validNumbers[0] });
                }
            }
            
            // AI chooses based on difficulty
            if (obviousMoves.length > 0 && Math.random() < aiConfig.obviousMovePriority) {
                move = obviousMoves[Math.floor(Math.random() * obviousMoves.length)];
            } else {
                // Make a valid random move
                const shuffled = [...emptyCells].sort(() => Math.random() - 0.5);
                for (const cell of shuffled) {
                    const validNumbers = getValidNumbers(cell.row, cell.col);
                    if (validNumbers.length > 0) {
                        move = {
                            ...cell,
                            number: validNumbers[Math.floor(Math.random() * validNumbers.length)]
                        };
                        break;
                    }
                }
            }
            
            if (move && gameState.solution[move.row][move.col] === move.number) {
                claimCell(move.row, move.col, move.number, 2);
                
                // In Pass & Play mode, switch turn back to Player 1 after AI moves
                if (gameState.gameMode === 'passplay') {
                    gameState.currentPlayer = 1;
                    updateTurnIndicator();
                }
                
                checkGameEnd();
            }
            
            scheduleAIMove();
        }

        // generatePuzzle is used by tournament match creation
        function generatePuzzle(difficulty) {
            return generateSudoku(difficulty || 'medium', 600, 'classic');
        }

        // ============================================================
        // 16×16 PUZZLE ENGINE
        // Numbers 1-16. Boxes are 4×4.
        // ============================================================
        function generate16x16Solution() {
            const N = 16, BS = 4;
            const grid = Array(N).fill(null).map(() => Array(N).fill(0));
            // Seed diagonal 4×4 boxes (no conflicts between them)
            for (let box = 0; box < N; box += BS) {
                const nums = Array.from({length:N},(_,i)=>i+1); shuffle(nums);
                let idx = 0;
                for (let r = box; r < box+BS; r++)
                    for (let c = box; c < box+BS; c++)
                        grid[r][c] = nums[idx++];
            }
            solve16(grid, N, BS);
            return grid;
        }

        // ── 16×16 fast bitmask solver ─────────────────────────────
        // rowMask[r], colMask[c], boxMask[b] each have bit i set if value i+1 is used.
        function buildMasks16(grid, N, BS) {
            const rm = new Int32Array(N), cm = new Int32Array(N), bm = new Int32Array(N);
            for (let r = 0; r < N; r++)
                for (let c = 0; c < N; c++) {
                    const v = grid[r][c];
                    if (v) {
                        const bit = 1 << (v - 1);
                        rm[r] |= bit; cm[c] |= bit;
                        bm[Math.floor(r/BS)*BS + Math.floor(c/BS)] |= bit;
                    }
                }
            return { rm, cm, bm };
        }

        function valid16(grid, row, col, num, N, BS) {
            for (let c = 0; c < N; c++) if (grid[row][c] === num) return false;
            for (let r = 0; r < N; r++) if (grid[r][col] === num) return false;
            const br = Math.floor(row/BS)*BS, bc = Math.floor(col/BS)*BS;
            for (let r = br; r < br+BS; r++)
                for (let c = bc; c < bc+BS; c++)
                    if (grid[r][c] === num) return false;
            return true;
        }

        function find16Empty(grid, N) {
            for (let r = 0; r < N; r++)
                for (let c = 0; c < N; c++)
                    if (grid[r][c] === 0) return [r, c];
            return null;
        }

        // MRV: pick the empty cell with fewest legal values
        function findMRV16(grid, N, BS, rm, cm, bm) {
            let bestR=-1, bestC=-1, bestCount=N+1;
            const full = (1<<N)-1;
            for (let r=0; r<N; r++) for (let c=0; c<N; c++) {
                if (grid[r][c] !== 0) continue;
                const b = Math.floor(r/BS)*BS + Math.floor(c/BS);
                const used = rm[r] | cm[c] | bm[b];
                const avail = full & ~used;
                const count = avail === 0 ? 0 : avail.toString(2).split('').filter(x=>x==='1').length;
                if (count < bestCount) { bestCount=count; bestR=r; bestC=c;
                    if (count === 0) return [r, c, 0]; // dead end early exit
                }
            }
            return bestR === -1 ? null : [bestR, bestC, bestCount];
        }

        function solve16(grid, N, BS) {
            const { rm, cm, bm } = buildMasks16(grid, N, BS);
            return _solve16Mask(grid, N, BS, rm, cm, bm);
        }

        function _solve16Mask(grid, N, BS, rm, cm, bm) {
            const mrv = findMRV16(grid, N, BS, rm, cm, bm);
            if (!mrv) return true; // no empty cells
            const [row, col, avail] = mrv;
            if (avail === 0) return false; // dead end
            const b = Math.floor(row/BS)*BS + Math.floor(col/BS);
            const full = (1<<N)-1;
            let bits = full & ~(rm[row] | cm[col] | bm[b]);
            while (bits) {
                const lsb  = bits & (-bits);
                bits &= bits-1;
                const num  = Math.log2(lsb) + 1;
                grid[row][col] = num;
                rm[row] |= lsb; cm[col] |= lsb; bm[b] |= lsb;
                if (_solve16Mask(grid, N, BS, rm, cm, bm)) return true;
                grid[row][col] = 0;
                rm[row] ^= lsb; cm[col] ^= lsb; bm[b] ^= lsb;
            }
            return false;
        }

        function countSolutions16(grid, limit, N, BS) {
            const { rm, cm, bm } = buildMasks16(grid, N, BS);
            return _count16(grid, limit, N, BS, rm, cm, bm);
        }

        function _count16(grid, limit, N, BS, rm, cm, bm) {
            const mrv = findMRV16(grid, N, BS, rm, cm, bm);
            if (!mrv) return 1;
            const [row, col, avail] = mrv;
            if (avail === 0) return 0;
            const b = Math.floor(row/BS)*BS + Math.floor(col/BS);
            const full = (1<<N)-1;
            let bits = full & ~(rm[row] | cm[col] | bm[b]);
            let count = 0;
            while (bits && count < limit) {
                const lsb = bits & (-bits); bits &= bits-1;
                const num = Math.log2(lsb) + 1;
                grid[row][col] = num;
                rm[row]|=lsb; cm[col]|=lsb; bm[b]|=lsb;
                count += _count16(grid, limit-count, N, BS, rm, cm, bm);
                grid[row][col] = 0;
                rm[row]^=lsb; cm[col]^=lsb; bm[b]^=lsb;
            }
            return count;
        }

        function generateSudoku16(difficulty) {
            const N = 16, BS = 4;
            const solution = generate16x16Solution();
            const puzzle = solution.map(r => [...r]);
            // Clue targets per difficulty. We skip per-removal uniqueness checks
            // (countSolutions16 on a 16x16 is too slow for the main thread and freezes the UI).
            // Rotationally-symmetric removal ensures a well-formed puzzle without that check.
            // easy≈112, medium≈96, hard≈80, extreme≈64
            const targets = { easy: 112, medium: 96, hard: 80, extreme: 64 };
            const target = targets[difficulty] || 96;
            const positions = [];
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) positions.push([r, c]);
            shuffle(positions);
            let givens = N * N; // 256
            for (const [r, c] of positions) {
                if (givens <= target) break;
                // Remove symmetrically (rotational 180° pair) for aesthetic balance
                const rr = N - 1 - r, rc = N - 1 - c;
                if (puzzle[r][c] !== 0) {
                    puzzle[r][c] = 0;
                    givens--;
                }
                if (givens > target && (rr !== r || rc !== c) && puzzle[rr][rc] !== 0) {
                    puzzle[rr][rc] = 0;
                    givens--;
                }
            }
            return { puzzle, solution };
        }

        function startGame16(difficulty) {
            const diff = difficulty || 'medium';
            gameState.gridSize = 16;
            gameState.boxSize  = 4;
            gameState.variant  = 'classic'; // variants not supported on 16×16
            gameState.difficulty = diff;
            gameState.gameMode   = 'solo';
            gameState.vsAI       = false;

            const { puzzle, solution } = generateSudoku16(diff);
            gameState.puzzle   = puzzle;
            gameState.solution = solution;
            gameState.claims   = Array(16).fill(null).map(() => Array(16).fill(0));
            gameState.pencilMarks = Array(16).fill(null).map(() =>
                Array(16).fill(null).map(() => new Set()));
            for (let r = 0; r < 16; r++)
                for (let c = 0; c < 16; c++)
                    if (gameState.puzzle[r][c] !== 0) gameState.claims[r][c] = -1;

            gameState.timeRemaining = Infinity;
            gameState.dojoElapsed   = 0;
            gameState.scores        = { p1: 0, p2: 0 };
            gameState.totalWrongMoves = 0;
            _lastCorrectMoveTime    = Date.now();
            gameState.currentPlayer = 1;
            gameState.isRunning     = true;
            gameState.isPaused      = false;
            gameState.selectedCell  = null;
            gameState.lastMoveCell  = null;
            gameState.animatingCells.clear();
            gameState.lastTick      = Date.now();
            _lastTimerStr = { p1: '', p2: '' };
            gameState.wrongMoves    = 0;
            gameState.totalWrongMoves = 0;
            gameState.hintsUsed     = 0;
            gameState.errorCell     = null;
            gameState.highlightNumber = null;
            gameState.floatingScores  = [];

            // Build 16-button number pad dynamically
            rebuildNumberPad(16);
            updateTimerDisplay();
            updateScores();
            updateHintDisplay();

            lobby.style.display = 'none';
            gameScreen.classList.add('active');
            resizeCanvas();
            markGridDirty();
            drawGrid();
            updateRemainingCounts();
            requestAnimationFrame(gameLoop);
        }

        // Stores the original 9-button pad HTML so we can restore it exactly when
        // returning from 16x16 mode. The 9x9 pad is never rebuilt programmatically.
        let _originalNumberPadHTML = null;

        function rebuildNumberPad(N) {
            const pad = document.getElementById('permanent-number-pad');
            if (!pad) return;

            if (N === 9) {
                // Restore original static HTML exactly — no inline style changes
                if (_originalNumberPadHTML !== null) {
                    pad.innerHTML = _originalNumberPadHTML;
                    pad.style.gridTemplateColumns = '';
                }
                // Re-attach click listeners (DOM was replaced, so old listeners are gone)
                pad.querySelectorAll('.num-pad-btn[data-num]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (gameState.gameMode === 'passplay' && gameState.currentPlayer !== 1 && gameState.inputMode !== 'pencil') return;
                        const num = parseInt(btn.dataset.num);
                        if (!btn.classList.contains('disabled')) handleNumberInput(num);
                    });
                });
                return;
            }

            // First time entering 16x16: snapshot the original HTML
            if (_originalNumberPadHTML === null) {
                _originalNumberPadHTML = pad.innerHTML;
            }

            // Build 16-button pad (8 columns x 2 rows)
            pad.innerHTML = '';
            pad.style.gridTemplateColumns = 'repeat(8, 1fr)';
            for (let i = 1; i <= N; i++) {
                const btn = document.createElement('button');
                btn.className = 'num-pad-btn';
                btn.dataset.num = i;
                btn.innerHTML = i + '<span class="num-remaining" id="remaining-' + i + '">' + N + '</span>';
                btn.addEventListener('click', () => {
                    if (gameState.gameMode === 'passplay' && gameState.currentPlayer !== 1 && gameState.inputMode !== 'pencil') return;
                    if (!btn.classList.contains('disabled')) handleNumberInput(i);
                });
                pad.appendChild(btn);
            }
        }

        function getValidNumbers(row, col) {
            const valid = [];
            for (let num = 1; num <= 9; num++) {
                if (isValidMove(row, col, num)) {
                    valid.push(num);
                }
            }
            return valid;
        }

        function isValidMove(row, col, num) {
            // For 16×16 mode use the dedicated 16×16 validator
            if (gameState.gridSize === 16) {
                return valid16(gameState.puzzle, row, col, num, 16, 4);
            }
            // 9×9: delegate to master variant-aware placement validator
            return isValidPlacement(gameState.puzzle, row, col, num, gameState.variant);
        }

        // ============================================
        // CLEANUP
        // ============================================
        window.addEventListener('beforeunload', () => {
            if (aiTimeout) clearTimeout(aiTimeout);
            if (supabase && onlineState.subscription) supabase.removeChannel(onlineState.subscription);
        });

        // ============================================
        // VIBRATION API
        // ============================================
        function vibrate(pattern) {
            if (navigator.vibrate) navigator.vibrate(pattern);
        }

        // ============================================
        // ONLINE MULTIPLAYER — SUPABASE
        // ============================================
        let supabaseClient = null;
        let onlineState = {
            enabled: false,
            roomId: null,
            playerSlot: null,
            subscription: null,
            isHost: false,
            appliedMoves: new Set(),
            _pollInterval: null,
            _mmInterval: null,
            _myMMId: null,
        };

        function generateRoomId() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            return Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        }

        function getShareLink(roomId) {
            return window.location.href.split('?')[0].split('#')[0] + '?room=' + roomId;
        }

        // Hardcoded credentials — no setup needed
        const SUPABASE_URL = 'https://bgpwqgbjfvyfxmfsauff.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncHdxZ2JqZnZ5ZnhtZnNhdWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjU5ODksImV4cCI6MjA4NzA0MTk4OX0.zfakwvim5hL6CBJvX-HcWRHCIaf10Tg8RQqnw9QCIu8';

        // Persist credentials in IndexedDB (survives PWA reinstalls, unlike localStorage)
        async function saveCredentials(url, key) {
            try {
                const db = await openCredDB();
                const tx = db.transaction('creds', 'readwrite');
                tx.objectStore('creds').put({ id: 'sb', url, key });
            } catch(e) { 
                // Fallback to localStorage
                localStorage.setItem('sb_url', url);
                localStorage.setItem('sb_key', key);
            }
        }

        async function loadCredentials() {
            try {
                const db = await openCredDB();
                return new Promise((resolve) => {
                    const tx = db.transaction('creds', 'readonly');
                    const req = tx.objectStore('creds').get('sb');
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror  = () => resolve(null);
                });
            } catch(e) {
                // Fallback to localStorage
                const url = localStorage.getItem('sb_url');
                const key = localStorage.getItem('sb_key');
                return (url && key) ? { url, key } : null;
            }
        }

        function openCredDB() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open('sudoku-config', 1);
                req.onupgradeneeded = e => e.target.result.createObjectStore('creds', { keyPath: 'id' });
                req.onsuccess = e => resolve(e.target.result);
                req.onerror   = e => reject(e.target.error);
            });
        }

        async function connectSupabase() {
            const url = document.getElementById('sb-url').value.trim();
            const key = document.getElementById('sb-key').value.trim();
            const statusEl = document.getElementById('config-status');
            if (!url || !key) {
                statusEl.className = 'config-status err';
                statusEl.textContent = '● Enter both URL and key';
                return;
            }
            statusEl.className = 'config-status idle';
            statusEl.textContent = '● Connecting…';
            try {
                supabaseClient = window.supabase.createClient(url, key, {
                    auth: {
                        persistSession: true,
                        detectSessionInUrl: false,
                        flowType: 'implicit',
                        lock: async (name, acquireTimeout, fn) => fn(), // bypass LockManager
                    }
                });
                const { error } = await supabaseClient.from('sudoku_rooms').select('id').limit(1);
                if (error) throw error;
                await saveCredentials(url, key);
                // Also keep localStorage as fallback
                localStorage.setItem('sb_url', url);
                localStorage.setItem('sb_key', key);
                statusEl.className = 'config-status ok';
                statusEl.textContent = '● Connected ✓';
                document.getElementById('supabase-config-box').style.display = 'none';
                document.getElementById('online-buttons').style.display = 'flex';
                onlineState.enabled = true;
                startRealtimeStats();
                loadTournaments();
            } catch(e) {
                statusEl.className = 'config-status err';
                statusEl.textContent = '● ' + (e.message || 'Connection failed — check URL & key');
                supabaseClient = null;
            }
        }

        // ============================================================
        // REAL-TIME STATS — online players (Presence) + active games
        // ============================================================
        let _presenceChannel = null;
        let _onlineUserIds = new Set(); // IDs of users currently online

        function startRealtimeStats() {
            if (!supabaseClient) return;

            // 1. Presence channel — each tab joins, we count members + track online user IDs
            if (_presenceChannel) supabaseClient.removeChannel(_presenceChannel);
            _presenceChannel = supabaseClient.channel('lobby-presence', {
                config: { presence: { key: 'player' } }
            });

            _presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = _presenceChannel.presenceState();
                    const count = Object.keys(state).length;
                    document.getElementById('online-players').textContent = count.toLocaleString();
                    // Rebuild online user ID set
                    _onlineUserIds = new Set();
                    Object.values(state).forEach(presences => {
                        presences.forEach(p => { if (p.user_id) _onlineUserIds.add(p.user_id); });
                    });
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        const uid = currentUser?.id || 'guest-' + Math.random().toString(36).slice(2);
                        await _presenceChannel.track({
                            user_id: uid,
                            online_at: new Date().toISOString()
                        });
                        // Write last_seen to profile so friends can see it when offline
                        if (currentUser && supabaseClient) {
                            supabaseClient.from('profiles')
                                .update({ last_seen: new Date().toISOString() })
                                .eq('id', currentUser.id)
                                .then(() => {});
                            // Keep refreshing every 2 min while app is open
                            setInterval(() => {
                                supabaseClient.from('profiles')
                                    .update({ last_seen: new Date().toISOString() })
                                    .eq('id', currentUser.id)
                                    .then(() => {});
                            }, 2 * 60 * 1000);
                        }
                    }
                });

            // 2. Active games — count sudoku_rooms updated in last 30 min, refresh every 15s
            async function refreshGameCount() {
                const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
                const { count } = await supabaseClient
                    .from('sudoku_rooms')
                    .select('id', { count: 'exact', head: true })
                    .gte('updated_at', since);
                if (count !== null) {
                    document.getElementById('active-games').textContent = count.toLocaleString();
                }
            }
            refreshGameCount();
            setInterval(refreshGameCount, 15000);

            // 3. Subscribe to room changes so game count updates in near-real-time
            supabaseClient
                .channel('rooms-count')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'sudoku_rooms' }, refreshGameCount)
                .subscribe();
        }

        // ============================================================
        // TOURNAMENTS — fetch from Supabase and render live
        // ============================================================
        // ============================================================
        // TOURNAMENTS — lobby widget
        // ============================================================
        async function loadTournaments() {
            if (!supabaseClient) return;
            const now = new Date().toISOString();
            const { data, error } = await supabaseClient
                .from('tournaments')
                .select('*')
                .in('status', ['waiting', 'active'])
                .order('starts_at', { ascending: true })
                .limit(5);

            const container = document.getElementById('lobby-tournaments-list');
            if (!container) return;

            if (error || !data || data.length === 0) {
                container.innerHTML = `<div style="color:#555;font-size:0.85rem;padding:12px 0;">No active tournaments. <span style="color:#d59020;cursor:pointer;" onclick="goToTournamentsPage()">Create one →</span></div>`;
                return;
            }

            container.innerHTML = data.map(t => {
                const icon = ICONS[t.icon] || '🏆';
                const statusLabel = t.status === 'active' ? '🟢 Live' : '⏳ Waiting';
                return `
                    <div class="list-item" style="cursor:pointer;" onclick="openTournamentDetail('${t.id}')">
                        <div style="font-size:1.4rem;width:36px;text-align:center;">${icon}</div>
                        <div class="list-content">
                            <div class="list-title">${t.name}</div>
                            <div class="list-meta">${t.time_control} • ${statusLabel}</div>
                        </div>
                        <div class="list-right">
                            <div class="list-players">👤 ${t.player_count}</div>
                        </div>
                    </div>`;
            }).join('');

            // Remove any existing subscription before creating a new one
            if (_lobbyTournamentsChannel) {
                supabaseClient.removeChannel(_lobbyTournamentsChannel);
                _lobbyTournamentsChannel = null;
            }
            _lobbyTournamentsChannel = supabaseClient.channel('lobby-tournaments-live')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, loadTournaments)
                .subscribe();
        }

        // ============================================================
        // TOURNAMENTS PAGE — full system
        // ============================================================
        const ICONS = { fire: '🔥', bolt: '⚡', trophy: '🏆', star: '⭐', crown: '👑' };
        let _currentTournamentId = null;
        let _tournamentDetailInterval = null;
        // Keep references so we can remove old channels before re-subscribing
        let _lobbyTournamentsChannel = null;
        let _tournamentPageChannel = null;

        // Exposed globally for inline onclick in HTML
        window.toggleScheduled = function() {
            const mode = document.getElementById('t-start-mode').value;
            const row  = document.getElementById('t-schedule-row');
            row.style.display = mode === 'scheduled' ? 'flex' : 'none';
            if (mode === 'scheduled') {
                // Default to 1 hour from now
                const dt = new Date(Date.now() + 3600000);
                dt.setSeconds(0, 0);
                document.getElementById('t-scheduled-at').value =
                    dt.toISOString().slice(0, 16);
            }
        };

        window.copyTournamentLink = function() {
            const link = document.getElementById('td-link').textContent;
            navigator.clipboard.writeText(link).then(() => showToast('Link copied!', 1500));
        };

        function initTournamentsPage() {
            const menuBtn = document.getElementById('tournaments-menu-btn');
            if (menuBtn) menuBtn.addEventListener('click', () => {
                document.getElementById('side-menu').classList.add('active');
                document.getElementById('side-menu-overlay').classList.add('active');
            });

            document.getElementById('create-tournament-btn').addEventListener('click', () => {
                if (!currentUser) {
                    showToast('Sign in to create a tournament', 2500);
                    setTimeout(() => document.getElementById('side-auth-btn')?.click(), 600);
                    return;
                }
                // Reset form
                document.getElementById('t-name').value = '';
                document.getElementById('t-start-mode').value = 'now';
                document.getElementById('t-schedule-row').style.display = 'none';
                document.getElementById('create-tournament-error').textContent = '';
                document.getElementById('create-tournament-modal').classList.add('active');
            });

            document.getElementById('create-tournament-cancel').addEventListener('click', () =>
                document.getElementById('create-tournament-modal').classList.remove('active'));

            document.getElementById('create-tournament-submit').addEventListener('click', createTournament);

            document.getElementById('td-close-btn').addEventListener('click', () => {
                document.getElementById('tournament-detail-modal').classList.remove('active');
                clearInterval(_tournamentDetailInterval);
                _tournamentDetailInterval = null;
            });

            document.getElementById('td-join-btn').addEventListener('click', joinCurrentTournament);
            document.getElementById('td-launch-btn').addEventListener('click', launchTournament);
            document.getElementById('td-leave-btn').addEventListener('click', leaveCurrentTournament);
            document.getElementById('td-delete-btn').addEventListener('click', deleteCurrentTournament);

            // Leaderboard TC tabs
            document.querySelectorAll('.friends-tab[data-lb]').forEach(tab => {
                tab.addEventListener('click', () => loadLeaderboard(tab.dataset.lb));
            });

            // Deep link
            const params = new URLSearchParams(window.location.search);
            if (params.get('tournament')) {
                setTimeout(() => openTournamentDetail(params.get('tournament')), 1000);
            }
        }

        async function loadTournamentsPage() {
            if (!supabaseClient) {
                document.getElementById('tournaments-list').innerHTML =
                    '<div class="empty-state" style="color:#555;">Connecting…</div>';
                setTimeout(loadTournamentsPage, 2000);
                return;
            }

            const now = new Date().toISOString();
            const weekAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();

            const { data: active } = await supabaseClient
                .from('tournaments').select('*')
                .in('status', ['waiting', 'active'])
                .order('starts_at', { ascending: true });

            const { data: past } = await supabaseClient
                .from('tournaments').select('*')
                .eq('status', 'finished')
                .gte('ends_at', weekAgo)
                .order('ends_at', { ascending: false }).limit(5);

            renderTournamentsList(active || [], 'tournaments-list', false);
            renderTournamentsList(past   || [], 'tournaments-past', true);

            // Remove any existing subscription before creating a new one
            if (_tournamentPageChannel) {
                supabaseClient.removeChannel(_tournamentPageChannel);
                _tournamentPageChannel = null;
            }
            _tournamentPageChannel = supabaseClient.channel('tournaments-page-live')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, loadTournamentsPage)
                .subscribe();
        }

        function fmtCountdown(ms) {
            if (ms <= 0) return '0m';
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            if (h > 0) return h + 'h ' + m + 'm';
            if (m > 0) return m + 'm ' + s + 's';
            return s + 's';
        }

        function renderTournamentsList(list, containerId, isPast) {
            const el = document.getElementById(containerId);
            if (!el) return;
            if (!list.length) {
                el.innerHTML = `<div class="empty-state" style="color:#555;">${isPast ? 'No recent tournaments.' : 'No tournaments yet — create one!'}</div>`;
                return;
            }
            el.innerHTML = list.map(t => {
                const icon = ICONS[t.icon] || '🏆';
                const startsAt = new Date(t.starts_at_scheduled || t.starts_at);
                const now = Date.now();
                let timeLabel;
                if (isPast) timeLabel = 'Finished';
                else if (t.status === 'active') timeLabel = '🟢 Live now';
                else if (startsAt > now) timeLabel = '⏳ Starts in ' + fmtCountdown(startsAt - now);
                else timeLabel = '⏳ Waiting for players';

                return `
                    <div class="list-item" style="cursor:pointer;opacity:${isPast ? 0.55 : 1}"
                         onclick="openTournamentDetail('${t.id}')">
                        <div style="font-size:1.6rem;width:44px;height:44px;display:flex;align-items:center;
                             justify-content:center;border-radius:50%;background:#262421;">${icon}</div>
                        <div class="list-content">
                            <div class="list-title">${t.name}</div>
                            <div class="list-meta">${t.time_control} • ${timeLabel}</div>
                        </div>
                        <div class="list-right" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                            <div class="list-players">👤 ${t.player_count}</div>
                            ${!isPast ? '<div style="font-size:0.7rem;color:#d59020;font-weight:700;">VIEW →</div>' : ''}
                        </div>
                    </div>`;
            }).join('');
        }

        async function openTournamentDetail(tid) {
            if (!supabaseClient) return;
            _currentTournamentId = tid;

            // Load tournament + participants + matches in parallel
            const [{ data: t }, { data: participants }, { data: matches }] = await Promise.all([
                supabaseClient.from('tournaments').select('*').eq('id', tid).single(),
                supabaseClient.from('tournament_participants').select('*').eq('tournament_id', tid).order('score', { ascending: false }),
                supabaseClient.from('tournament_matches').select('*').eq('tournament_id', tid).order('round')
            ]);

            if (!t) { showToast('Tournament not found', 2000); return; }

            const link = location.origin + location.pathname + '?tournament=' + t.id;
            const isCreator = currentUser?.id === t.creator_id;
            const isParticipant = participants?.some(p => p.player_id === currentUser?.id);
            const startsAt = new Date(t.starts_at_scheduled || t.starts_at);
            const now = Date.now();

            // Header
            document.getElementById('td-name').textContent = (ICONS[t.icon] || '🏆') + ' ' + t.name;
            document.getElementById('td-meta').textContent = t.time_control + ' Rated • ' + (t.min_players || 2) + '+ players to start';
            document.getElementById('td-players').textContent = t.player_count;
            document.getElementById('td-link').textContent = link;

            // Status badge + countdown
            const statusBadge = document.getElementById('td-status-badge');
            const timeLeftEl  = document.getElementById('td-time-left');
            const timeLabelEl = document.getElementById('td-time-label');

            if (t.status === 'finished') {
                statusBadge.textContent = '🏁 Done';
                timeLeftEl.textContent  = '—';
                timeLabelEl.textContent = '';
            } else if (t.status === 'active') {
                statusBadge.textContent = '🟢 Live';
                timeLabelEl.textContent = 'Time left';
            } else {
                statusBadge.textContent = '⏳ Waiting';
                timeLabelEl.textContent = startsAt > now ? 'Starts in' : 'Waiting';
            }

            // Live countdown ticker
            clearInterval(_tournamentDetailInterval);
            if (t.status !== 'finished') {
                _tournamentDetailInterval = setInterval(() => {
                    const ms = t.status === 'active'
                        ? new Date(t.ends_at) - Date.now()
                        : startsAt - Date.now();
                    timeLeftEl.textContent = ms > 0 ? fmtCountdown(ms) : '—';
                    // Auto-check if scheduled start time passed and status still waiting
                    if (t.status === 'waiting' && startsAt <= Date.now() && t.player_count >= (t.min_players || 2) && isCreator) {
                        clearInterval(_tournamentDetailInterval);
                        launchTournament();
                    }
                }, 1000);
            }

            // Min players notice
            const minNotice = document.getElementById('td-min-notice');
            const needsMore = t.player_count < (t.min_players || 2);
            minNotice.style.display = needsMore && t.status === 'waiting' ? 'block' : 'none';
            document.getElementById('td-min-num').textContent = t.min_players || 2;

            // Participants list
            const pEl = document.getElementById('td-participants');
            if (!participants || participants.length === 0) {
                pEl.innerHTML = '<div style="color:#555;font-size:0.82rem;">No participants yet — be the first!</div>';
            } else {
                pEl.innerHTML = participants.map((p, i) => `
                    <div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:#1a1816;border-radius:8px;">
                        <div style="color:#d59020;font-weight:700;width:20px;text-align:center;">${i + 1}</div>
                        <div style="flex:1;font-size:0.85rem;">${p.player_name || 'Player'}</div>
                        <div style="font-size:0.78rem;color:#777;">${p.score} pts · ${p.games_played} games</div>
                        ${p.player_id === currentUser?.id ? '<div style="font-size:0.7rem;color:#d59020;font-weight:700;">YOU</div>' : ''}
                    </div>`).join('');
            }

            // Matches
            const matchSec = document.getElementById('td-matches-section');
            const matchEl  = document.getElementById('td-matches');
            if (matches && matches.length > 0) {
                matchSec.style.display = 'block';
                document.getElementById('td-round-num').textContent = t.current_round || 1;
                matchEl.innerHTML = matches
                    .filter(m => m.round === (t.current_round || 1))
                    .map(m => {
                        const winner = m.winner_id
                            ? (m.winner_id === m.player1_id ? m.player1_name : m.player2_name)
                            : null;
                        const statusColor = m.status === 'finished' ? '#4a4' : m.status === 'active' ? '#d59020' : '#555';
                        const myMatch = m.player1_id === currentUser?.id || m.player2_id === currentUser?.id;
                        return `
                            <div style="background:#1a1816;border-radius:8px;padding:10px 12px;
                                        border-left:3px solid ${statusColor};${myMatch ? 'border-color:#d59020;' : ''}">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <span style="font-size:0.85rem;">${m.player1_name}</span>
                                    <span style="color:#555;font-size:0.75rem;">vs</span>
                                    <span style="font-size:0.85rem;">${m.player2_name}</span>
                                </div>
                                ${winner ? `<div style="text-align:center;font-size:0.72rem;color:#4a4;margin-top:4px;">🏆 ${winner} won</div>` : ''}
                                ${m.status === 'active' && myMatch && m.room_id ? `
                                    <button onclick="document.getElementById('join-code-input').value='${m.room_id}';document.getElementById('join-confirm-btn').click();document.getElementById('tournament-detail-modal').classList.remove('active');"
                                        style="margin-top:8px;width:100%;background:#d59020;color:#161512;border:none;padding:7px;border-radius:6px;font-weight:700;font-size:0.8rem;cursor:pointer;">
                                        ▶ Enter Match Room
                                    </button>` : ''}
                            </div>`;
                    }).join('');
            } else {
                matchSec.style.display = 'none';
            }

            // Button visibility
            document.getElementById('td-join-btn').style.display =
                (t.status === 'waiting' && !isParticipant && currentUser) ? 'block' : 'none';
            document.getElementById('td-launch-btn').style.display =
                (t.status === 'waiting' && isCreator && t.player_count >= (t.min_players || 2)) ? 'block' : 'none';
            document.getElementById('td-leave-btn').style.display =
                (t.status === 'waiting' && isParticipant && !isCreator) ? 'block' : 'none';
            document.getElementById('td-delete-btn').style.display =
                (t.status === 'waiting' && isCreator) ? 'block' : 'none';

            document.getElementById('tournament-detail-modal').classList.add('active');

            // Realtime refresh while modal is open
            supabaseClient.channel('td-live-' + tid)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants',
                    filter: 'tournament_id=eq.' + tid }, () => openTournamentDetail(tid))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches',
                    filter: 'tournament_id=eq.' + tid }, () => openTournamentDetail(tid))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments',
                    filter: 'id=eq.' + tid }, () => openTournamentDetail(tid))
                .subscribe();
        }

        async function joinCurrentTournament() {
            if (!_currentTournamentId) return;
            if (!currentUser) {
                showToast('Sign in to join tournaments', 2000);
                document.getElementById('tournament-detail-modal').classList.remove('active');
                document.getElementById('auth-modal').classList.add('active');
                return;
            }

            const btn = document.getElementById('td-join-btn');
            btn.textContent = 'Joining…';
            btn.disabled = true;

            const { error } = await supabaseClient.from('tournament_participants').insert({
                tournament_id: _currentTournamentId,
                player_id: currentUser.id,
                player_name: currentProfile?.username || playerData.settings.username || 'Player',
                player_rating: playerData.rating || 2.0,
                score: 0,
                games_played: 0
            });

            btn.textContent = 'Join Tournament';
            btn.disabled = false;

            if (error) {
                if (error.code === '23505') showToast('You\'re already in this tournament!', 2000);
                else showToast('Error: ' + error.message, 3000);
                return;
            }

            showToast('You joined! Waiting for the tournament to start.', 3000);
            openTournamentDetail(_currentTournamentId);
        }

        async function launchTournament() {
            if (!_currentTournamentId || !currentUser) return;

            const { data: participants } = await supabaseClient
                .from('tournament_participants').select('*')
                .eq('tournament_id', _currentTournamentId);

            if (!participants || participants.length < 2) {
                showToast('Need at least 2 participants to launch!', 2500);
                return;
            }

            const btn = document.getElementById('td-launch-btn');
            btn.textContent = 'Launching…';
            btn.disabled = true;

            // Shuffle participants for random pairing
            const shuffled = [...participants].sort(() => Math.random() - 0.5);

            // Create round 1 matches — pair adjacent players
            const matchInserts = [];
            for (let i = 0; i < shuffled.length - 1; i += 2) {
                const p1 = shuffled[i];
                const p2 = shuffled[i + 1];
                const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();

                matchInserts.push({
                    tournament_id: _currentTournamentId,
                    round: 1,
                    player1_id: p1.player_id,
                    player2_id: p2.player_id,
                    player1_name: p1.player_name,
                    player2_name: p2.player_name,
                    room_id: roomId,
                    status: 'active'
                });

                // Create the actual Supabase game room for this match
                const timeLimit = 600; // default 10min — could read from tournament
                const puzzle = generatePuzzle('medium');
                await supabaseClient.from('sudoku_rooms').upsert({
                    id: roomId,
                    state: {
                        puzzle: puzzle.puzzle,
                        solution: puzzle.solution,
                        board: Array(81).fill(null),
                        claimedBy: Array(81).fill(null),
                        scores: { p1: 0, p2: 0 },
                        timers: { p1: timeLimit, p2: timeLimit },
                        status: 'waiting',
                        timeLimit,
                        tournamentId: _currentTournamentId
                    },
                    updated_at: new Date().toISOString()
                });
            }

            // If odd number, the last player gets a bye (free win)
            if (shuffled.length % 2 !== 0) {
                const byePlayer = shuffled[shuffled.length - 1];
                // Give them 1 point for the bye
                await supabaseClient.from('tournament_participants')
                    .update({ score: 1, games_played: 1 })
                    .eq('tournament_id', _currentTournamentId)
                    .eq('player_id', byePlayer.player_id);
            }

            await supabaseClient.from('tournament_matches').insert(matchInserts);

            // Update tournament status to active
            const duration = 120; // default 2h — use stored value if available
            await supabaseClient.from('tournaments').update({
                status: 'active',
                starts_at: new Date().toISOString(),
                ends_at: new Date(Date.now() + duration * 60000).toISOString(),
                current_round: 1
            }).eq('id', _currentTournamentId);

            btn.textContent = '🚀 Launch Tournament';
            btn.disabled = false;

            showToast('🚀 Tournament launched! Matches created.', 3000);
            openTournamentDetail(_currentTournamentId);
        }

        async function leaveCurrentTournament() {
            if (!_currentTournamentId || !currentUser) return;
            if (!confirm('Leave this tournament?')) return;
            const { error } = await supabaseClient
                .from('tournament_participants')
                .delete()
                .eq('tournament_id', _currentTournamentId)
                .eq('player_id', currentUser.id);
            if (error) { showToast('Error: ' + error.message, 3000); return; }
            // Decrement player_count
            await supabaseClient.rpc('decrement_tournament_players', { tid: _currentTournamentId })
                .catch(() => {}); // RPC may not exist — soft fail
            showToast('You left the tournament.', 2500);
            document.getElementById('tournament-detail-modal').classList.remove('active');
            clearInterval(_tournamentDetailInterval);
            loadTournamentsPage();
        }

        async function deleteCurrentTournament() {
            if (!_currentTournamentId || !currentUser) return;
            if (!confirm('Delete this tournament? This cannot be undone.')) return;
            const btn = document.getElementById('td-delete-btn');
            btn.textContent = 'Deleting…'; btn.disabled = true;
            try {
                // Delete child records first (FK constraints)
                await supabaseClient.from('tournament_matches').delete().eq('tournament_id', _currentTournamentId);
                await supabaseClient.from('tournament_participants').delete().eq('tournament_id', _currentTournamentId);
                await supabaseClient.from('tournaments').delete().eq('id', _currentTournamentId);
                showToast('Tournament deleted.', 2500);
                document.getElementById('tournament-detail-modal').classList.remove('active');
                clearInterval(_tournamentDetailInterval);
                loadTournamentsPage();
            } catch(e) {
                showToast('Delete failed: ' + e.message, 3000);
            } finally {
                btn.textContent = '🗑 Delete Tournament'; btn.disabled = false;
            }
        }

        async function createTournament() {
            const name       = document.getElementById('t-name').value.trim();
            const tc         = document.getElementById('t-time-control').value;
            const icon       = document.getElementById('t-icon').value;
            const duration   = parseInt(document.getElementById('t-duration').value);
            const minPlayers = parseInt(document.getElementById('t-min-players')?.value || 2);
            const maxPlayers = parseInt(document.getElementById('t-max-players')?.value || 16);
            const startMode  = document.getElementById('t-start-mode')?.value || 'now';
            const errEl      = document.getElementById('create-tournament-error');

            if (!name) { errEl.textContent = 'Please enter a tournament name.'; return; }
            if (!currentUser) { errEl.textContent = 'You must be signed in to create a tournament.'; return; }

            let scheduledAt = null;
            if (startMode === 'scheduled') {
                const val = document.getElementById('t-scheduled-at')?.value;
                if (!val) { errEl.textContent = 'Please pick a scheduled start time.'; return; }
                scheduledAt = new Date(val);
                if (scheduledAt <= new Date()) { errEl.textContent = 'Scheduled time must be in the future.'; return; }
            }

            errEl.textContent = '';
            document.getElementById('create-tournament-submit').textContent = 'Creating…';
            document.getElementById('create-tournament-submit').disabled = true;

            // ends_at is calculated from when it actually starts, not now
            const effectiveStart = scheduledAt || new Date();
            const { data, error } = await supabaseClient.from('tournaments').insert({
                name,
                time_control: tc,
                icon,
                status: 'waiting',
                starts_at: effectiveStart.toISOString(),
                starts_at_scheduled: scheduledAt ? scheduledAt.toISOString() : null,
                ends_at: new Date(effectiveStart.getTime() + duration * 60000).toISOString(),
                player_count: 0,
                min_players: minPlayers,
                max_players: maxPlayers,
                creator_id: currentUser.id,
                creator_username: currentProfile?.username || playerData.settings.username || 'Anonymous'
            }).select().single();

            document.getElementById('create-tournament-submit').textContent = 'Create Tournament';
            document.getElementById('create-tournament-submit').disabled = false;

            if (error) { errEl.textContent = error.message; return; }

            document.getElementById('create-tournament-modal').classList.remove('active');
            loadTournamentsPage();
            openTournamentDetail(data.id);
            showToast('Tournament created! Share the link to get players.', 3000);
        }

        // ============================================================
        // TECHNIQUE DOJO — Puzzle learning system
        // ============================================================
        const TECHNIQUES = [
            {
                id: 'naked_single',
                name: 'Naked Single',
                icon: '1️⃣',
                rank: 'Beginner',
                color: '#4a9',
                description: 'A cell with only ONE possible number. No guessing needed — just logic.',
                hint: 'Look for any cell where only one number fits after eliminating all others in the row, column, and box.',
                difficulty: 'easy',
                xp: 10,
            },
            {
                id: 'hidden_single',
                name: 'Hidden Single',
                icon: '🔍',
                rank: 'Beginner',
                color: '#4a9',
                description: 'A number that can only go in ONE cell within a row, column, or box — even if that cell has other candidates.',
                hint: 'Scan each row, column, and box. If a number only fits in one place, it belongs there.',
                difficulty: 'easy',
                xp: 15,
            },
            {
                id: 'naked_pair',
                name: 'Naked Pair',
                icon: '👥',
                rank: 'Intermediate',
                color: '#d59020',
                description: 'Two cells in the same unit both containing only the same two candidates. Those numbers are "locked" there — eliminate them elsewhere.',
                hint: 'Find two cells sharing exactly 2 candidates. Those numbers can\'t appear anywhere else in that row/column/box.',
                difficulty: 'medium',
                xp: 25,
            },
            {
                id: 'pointing_pair',
                name: 'Pointing Pair',
                icon: '👉',
                rank: 'Intermediate',
                color: '#d59020',
                description: 'When a candidate in a box is restricted to one row or column, it can be eliminated from the rest of that row/column.',
                hint: 'If a number in a 3×3 box only appears in one row, remove it from all other cells in that row outside the box.',
                difficulty: 'medium',
                xp: 30,
            },
            {
                id: 'hidden_pair',
                name: 'Hidden Pair',
                icon: '🎭',
                rank: 'Advanced',
                color: '#a55',
                description: 'Two numbers that can only go in two specific cells within a unit. All other candidates in those cells can be eliminated.',
                hint: 'Find two numbers that only appear in the same two cells in a unit — clear all other candidates from those cells.',
                difficulty: 'hard',
                xp: 40,
            },
            {
                id: 'x_wing',
                name: 'X-Wing',
                icon: '✈️',
                rank: 'Expert',
                color: '#a59',
                description: 'A candidate appearing in exactly two cells in each of two rows, and those cells share the same two columns — forms an "X" shape.',
                hint: 'If a number appears only twice in two different rows AND the same two columns, eliminate it from all other cells in those columns.',
                difficulty: 'hard',
                xp: 60,
            },
            {
                id: 'y_wing',
                name: 'Y-Wing',
                icon: '🪃',
                rank: 'Expert',
                color: '#a59',
                description: 'Three cells forming a "wing" pattern where eliminations chain across the board.',
                hint: 'Find a pivot cell with 2 candidates that sees two "wing" cells, each sharing one candidate with the pivot. The shared candidate of the wings can be eliminated from cells that see both wings.',
                difficulty: 'hard',
                xp: 80,
            },
            {
                id: 'daily_challenge',
                name: 'Daily Challenge',
                icon: '📅',
                rank: 'Special',
                color: '#d59020',
                description: 'A fresh hand-crafted puzzle every day. Combines multiple techniques. Share your solve time!',
                hint: 'Use everything you\'ve learned. This puzzle requires at least 3 different techniques.',
                difficulty: 'hard',
                xp: 100,
                isDaily: true,
            },
        ];

        function getTechniqueProgress() {
            return JSON.parse(localStorage.getItem('sudoku_technique_progress') || '{}');
        }

        function saveTechniqueProgress(progress) {
            localStorage.setItem('sudoku_technique_progress', JSON.stringify(progress));
        }

        function getTotalDojoXP() {
            const p = getTechniqueProgress();
            return Object.values(p).reduce((sum, t) => sum + (t.xp || 0), 0);
        }

        function getDojoRank(xp) {
            if (xp >= 300) return { rank: 'Grandmaster', color: '#d59020', icon: '🏆' };
            if (xp >= 150) return { rank: 'Expert',      color: '#a59',    icon: '⭐' };
            if (xp >= 70)  return { rank: 'Advanced',    color: '#a55',    icon: '🔥' };
            if (xp >= 25)  return { rank: 'Intermediate',color: '#d59020', icon: '📈' };
            return                 { rank: 'Beginner',   color: '#4a9',    icon: '🌱' };
        }

        function openTechniqueDojo() {
            const progress = getTechniqueProgress();
            const xp = getTotalDojoXP();
            const { rank, color, icon } = getDojoRank(xp);
            const todayKey = new Date().toISOString().split('T')[0];

            const html = `
                <div class="modal-overlay active" id="dojo-modal" onclick="if(event.target===this)closeDojo()">
                    <div class="modal" style="max-width:420px;max-height:88vh;overflow-y:auto;padding:0;">
                        <div style="background:linear-gradient(135deg,#1a1612,#262218);padding:20px;border-radius:14px 14px 0 0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <div>
                                    <div style="font-size:1.2rem;font-weight:800;color:#d59020;">🥋 Technique Dojo</div>
                                    <div style="font-size:0.78rem;color:#777;margin-top:2px;">Master solving techniques step by step</div>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-size:0.7rem;font-weight:700;color:${color};">${icon} ${rank}</div>
                                    <div style="font-size:1.1rem;font-weight:800;color:#d59020;">${xp} XP</div>
                                </div>
                            </div>
                            <!-- XP bar -->
                            <div style="margin-top:12px;background:#2a2520;border-radius:4px;height:6px;overflow:hidden;">
                                <div style="width:${Math.min(100, (xp % 150) / 1.5)}%;height:100%;background:#d59020;border-radius:4px;transition:width 0.5s;"></div>
                            </div>
                        </div>
                        <div style="padding:16px;display:flex;flex-direction:column;gap:10px;">
                            ${TECHNIQUES.map(t => {
                                const done  = progress[t.id];
                                const count = done?.count || 0;
                                const earnedXP = done?.xp || 0;
                                const isLocked = !done && TECHNIQUES.indexOf(t) > 0 &&
                                    !progress[TECHNIQUES[TECHNIQUES.indexOf(t) - 1]?.id];
                                const isDaily = t.isDaily;
                                const dailyDone = isDaily && progress[t.id]?.lastDate === todayKey;
                                return `
                                <div onclick="${isLocked ? '' : `startDojoTechnique('${t.id}')`}"
                                    style="background:#1a1816;border-radius:10px;padding:14px;cursor:${isLocked ? 'default' : 'pointer'};
                                           opacity:${isLocked ? 0.4 : 1};border-left:3px solid ${done ? t.color : '#333'};
                                           transition:transform 0.1s;" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform=''">
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <div style="font-size:1.6rem;">${isLocked ? '🔒' : (dailyDone ? '✅' : t.icon)}</div>
                                        <div style="flex:1;">
                                            <div style="font-size:0.9rem;font-weight:700;color:${done ? '#fff' : '#bababa'};">
                                                ${t.name}
                                                ${isDaily ? `<span style="font-size:0.65rem;background:#d59020;color:#161512;padding:1px 5px;border-radius:3px;margin-left:4px;">DAILY</span>` : ''}
                                            </div>
                                            <div style="font-size:0.72rem;color:#666;margin-top:2px;">${t.rank} · ${t.xp} XP${count > 0 ? ` · Solved ${count}×` : ''}</div>
                                        </div>
                                        <div style="font-size:0.75rem;color:${t.color};font-weight:700;">${earnedXP > 0 ? '+'+earnedXP+'xp' : ''}</div>
                                    </div>
                                    <div style="font-size:0.78rem;color:#666;margin-top:8px;line-height:1.5;">${t.description}</div>
                                </div>`;
                            }).join('')}
                        </div>
                        <div style="padding:0 16px 16px;">
                            <button onclick="closeDojo()" class="action-btn btn-secondary">Close</button>
                        </div>
                    </div>
                </div>`;

            document.body.insertAdjacentHTML('beforeend', html);
        }

        window.closeDojo = function() {
            document.getElementById('dojo-modal')?.remove();
        };

        window.startDojoTechnique = function(techniqueId) {
            const technique = TECHNIQUES.find(t => t.id === techniqueId);
            if (!technique) return;
            closeDojo();

            // Show technique intro before puzzle
            const todayKey = new Date().toISOString().split('T')[0];
            const progress = getTechniqueProgress();
            const isDaily = technique.isDaily;
            const dailyDone = isDaily && progress[techniqueId]?.lastDate === todayKey;

            const introHtml = `
                <div class="modal-overlay active" id="dojo-intro-modal">
                    <div class="modal" style="max-width:360px;">
                        <div class="modal-header" style="background:linear-gradient(135deg,#1a1612,#262218);">
                            <div style="font-size:2rem;margin-bottom:8px;">${technique.icon}</div>
                            <div class="modal-title">${technique.name}</div>
                            <div class="modal-subtitle" style="color:${technique.color};">${technique.rank}</div>
                        </div>
                        <div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px;">
                            <div style="background:#1a1816;border-radius:8px;padding:14px;font-size:0.85rem;color:#bababa;line-height:1.6;">
                                ${technique.description}
                            </div>
                            <div style="background:rgba(213,144,32,0.08);border:1px solid rgba(213,144,32,0.2);border-radius:8px;padding:12px;">
                                <div style="font-size:0.7rem;color:#d59020;font-weight:700;margin-bottom:6px;">💡 HOW TO SOLVE</div>
                                <div style="font-size:0.82rem;color:#bababa;line-height:1.5;">${technique.hint}</div>
                            </div>
                            ${dailyDone ? '<div style="text-align:center;color:#4a9;font-size:0.85rem;">✅ Already completed today! Come back tomorrow.</div>' : ''}
                            <div style="display:flex;gap:10px;">
                                <button onclick="document.getElementById(\'dojo-intro-modal\').remove();openTechniqueDojo();" class="action-btn btn-secondary" style="flex:1;">← Back</button>
                                ${!dailyDone ? `<button onclick="launchDojoGame('${techniqueId}')" class="action-btn btn-primary" style="flex:2;">Start Puzzle (+${technique.xp} XP)</button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', introHtml);
        };

        window.launchDojoGame = function(techniqueId) {
            document.getElementById('dojo-intro-modal')?.remove();
            const technique = TECHNIQUES.find(t => t.id === techniqueId);
            if (!technique) return;

            // Store which technique we're solving
            gameState.dojoTechniqueId = techniqueId;
            gameState.dojoStartTime = Date.now();

            // Set up game as solo puzzle mode
            gameState.gameMode = 'solo';
            gameState.difficulty = technique.difficulty;
            gameState.vsAI = false;
            gameState.timeLimit = 9999; // effectively untimed — timer counts up instead

            // Start the game
            startGame();

            // Show technique reminder banner in game
            setTimeout(() => {
                const existing = document.getElementById('dojo-banner');
                if (!existing) {
                    const banner = document.createElement('div');
                    banner.id = 'dojo-banner';
                    banner.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
                        background:#1a1816;border:1px solid ${technique.color};border-radius:8px;
                        padding:8px 14px;font-size:0.75rem;color:#bababa;z-index:500;max-width:300px;text-align:center;`;
                    banner.innerHTML = `${technique.icon} <strong style="color:${technique.color};">${technique.name}</strong> — ${technique.hint.slice(0,60)}… <span onclick="this.parentNode.remove()" style="cursor:pointer;color:#555;margin-left:8px;">✕</span>`;
                    document.body.appendChild(banner);
                }
            }, 500);

            showToast(`🥋 ${technique.name} puzzle started!`, 2000);
        };

        // Call this from endGame when in dojo mode
        function completeDojoPuzzle() {
            const tid = gameState.dojoTechniqueId;
            if (!tid) return;
            const technique = TECHNIQUES.find(t => t.id === tid);
            if (!technique) return;

            document.getElementById('dojo-banner')?.remove();
            gameState.dojoTechniqueId = null;
            gameState.isDailyChallenge = false;

            const solveMs = Date.now() - (gameState.dojoStartTime || Date.now());
            const solveSecs = Math.round(solveMs / 1000);
            const todayKey = new Date().toISOString().split('T')[0];

            const progress = getTechniqueProgress();
            const prev = progress[tid] || { count: 0, xp: 0 };
            const isFirstSolve = prev.count === 0;
            const isDaily = technique.isDaily;
            const dailyAlreadyDone = isDaily && prev.lastDate === todayKey;

            if (!dailyAlreadyDone) {
                progress[tid] = {
                    count: prev.count + 1,
                    xp: prev.xp + (isFirstSolve ? technique.xp : Math.floor(technique.xp * 0.2)),
                    lastDate: todayKey,
                    bestTime: prev.bestTime ? Math.min(prev.bestTime, solveSecs) : solveSecs,
                };
                saveTechniqueProgress(progress);

                const earnedXP = isFirstSolve ? technique.xp : Math.floor(technique.xp * 0.2);
                const totalXP = getTotalDojoXP();
                const { rank } = getDojoRank(totalXP);

                setTimeout(() => {
                    const celebHtml = `
                        <div class="modal-overlay active" id="dojo-complete-modal">
                            <div class="modal" style="max-width:340px;text-align:center;">
                                <div class="modal-body" style="padding:28px 20px;display:flex;flex-direction:column;gap:14px;align-items:center;">
                                    <div style="font-size:3rem;">${isFirstSolve ? '🎉' : '✅'}</div>
                                    <div style="font-size:1.2rem;font-weight:800;color:#d59020;">${isFirstSolve ? 'Technique Mastered!' : 'Solved Again!'}</div>
                                    <div style="font-size:0.85rem;color:#bababa;">${technique.name} · ${solveSecs}s</div>
                                    <div style="background:#1a1816;border-radius:8px;padding:12px 20px;width:100%;">
                                        <div style="font-size:1.4rem;font-weight:800;color:#d59020;">+${earnedXP} XP</div>
                                        <div style="font-size:0.75rem;color:#777;">${totalXP} total · ${rank}</div>
                                    </div>
                                    ${isFirstSolve ? `<div style="font-size:0.8rem;color:#4a9;">🔓 Next technique unlocked!</div>` : ''}
                                    <div style="display:flex;gap:10px;width:100%;">
                                        <button onclick="document.getElementById('dojo-complete-modal').remove();openTechniqueDojo();" class="action-btn btn-primary" style="flex:1;">Back to Dojo</button>
                                        <button onclick="document.getElementById('dojo-complete-modal').remove();window.launchDojoGame('${tid}');" class="action-btn btn-secondary" style="flex:1;">Again</button>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                    document.body.insertAdjacentHTML('beforeend', celebHtml);
                }, 500);
            }
        }

        async function tryRestoreSupabase() {
            // Always connect with hardcoded credentials — no user input needed
            document.getElementById('sb-url').value = SUPABASE_URL;
            document.getElementById('sb-key').value = SUPABASE_KEY;
            return connectSupabase();
        }

        // ============================================
        // MATCHMAKING
        // ============================================
        async function findOpponent() {
            if (!supabaseClient) { showToast('Not connected', 1500); return; }

            const myName   = playerData.settings.username || 'Player';
            const myRating = playerData.rating || 2.0;
            const myId     = currentUser?.id || ('guest_' + Math.random().toString(36).slice(2, 9));

            // Check the table exists first
            const { error: tableCheck } = await supabaseClient
                .from('matchmaking_queue').select('player_id').limit(1);
            if (tableCheck) {
                console.error('[Matchmaking] Table check failed:', tableCheck);
                if (tableCheck.code === '42P01' || tableCheck.message?.includes('does not exist')) {
                    showToast('⚠ Run the matchmaking SQL in Supabase first!', 4000);
                } else {
                    showToast('Error: ' + (tableCheck.message || tableCheck.code), 3000);
                }
                return;
            }

            // Show searching UI
            document.getElementById('waiting-title').textContent = 'Finding Opponent…';
            document.getElementById('waiting-room-section').style.display = 'none';
            document.getElementById('waiting-sub').style.display = 'none';
            document.getElementById('matchmaking-status').style.display = 'block';
            document.getElementById('waiting-overlay').classList.add('active');

            // Remove any stale entry first
            await supabaseClient.from('matchmaking_queue')
                .delete().eq('player_id', myId);

            // Add ourselves to the queue
            const { error } = await supabaseClient.from('matchmaking_queue').insert({
                player_id:   myId,
                player_name: myName,
                rating:      myRating,
                time_limit:  gameState.timeLimit,
                game_mode:   gameState.gameMode,
                difficulty:  gameState.difficulty,
                joined_at:   new Date().toISOString(),
            });

            if (error) {
                console.error('[Matchmaking] Insert error:', error);
                showToast('Matchmaking error: ' + (error.message || error.code || JSON.stringify(error)), 3000);
                hideWaitingOverlay();
                return;
            }

            let searchTime = 0;
            onlineState._myMMId = myId;

            // Poll for a match every 1.5s
            onlineState._mmInterval = setInterval(async () => {
                searchTime += 1.5;

                // Update status message
                const info = document.getElementById('matchmaking-info');
                if (info) {
                    if (searchTime < 10) info.textContent = `Searching for a player near your rating (${myRating.toFixed(1)})…`;
                    else if (searchTime < 30) info.textContent = `Still searching… expanding rating range`;
                    else info.textContent = `Searching globally… (${Math.floor(searchTime)}s)`;
                }

                // Widen rating range over time so we always eventually find someone
                const ratingRange = Math.min(0.5 + searchTime * 0.05, 5.0);

                // Look for another waiting player (not us, same time control, close rating)
                const { data: candidates } = await supabaseClient
                    .from('matchmaking_queue')
                    .select('*')
                    .neq('player_id', myId)
                    .eq('time_limit', gameState.timeLimit)
                    .gte('rating', myRating - ratingRange)
                    .lte('rating', myRating + ratingRange)
                    .order('joined_at', { ascending: true })
                    .limit(1);

                if (!candidates || candidates.length === 0) return;

                const opponent = candidates[0];

                // We found someone — the one who joined LATER creates the room
                // (the earlier player becomes host, later player joins)
                // We determine this by comparing joined_at times
                const { data: me } = await supabaseClient
                    .from('matchmaking_queue')
                    .select('joined_at')
                    .eq('player_id', myId)
                    .single();

                if (!me) return; // we were already matched and removed

                const iJoinedLater = new Date(me.joined_at) >= new Date(opponent.joined_at);

                clearInterval(onlineState._mmInterval);
                onlineState._mmInterval = null;

                if (iJoinedLater) {
                    // I join the opponent's implicit room — they are the host
                    // Remove both from queue and create the room as host = opponent
                    await supabaseClient.from('matchmaking_queue')
                        .delete().in('player_id', [myId, opponent.player_id]);
                    await startMatchmakingAsGuest(opponent);
                } else {
                    // I am the host — wait a moment to see if the opponent picks me up
                    // If they don't remove me from queue within 2s, I create the room
                    setTimeout(async () => {
                        const { data: stillInQueue } = await supabaseClient
                            .from('matchmaking_queue')
                            .select('player_id')
                            .eq('player_id', myId)
                            .single();

                        if (stillInQueue) {
                            // Opponent hasn't removed us yet — I'll create the room as host
                            await supabaseClient.from('matchmaking_queue')
                                .delete().in('player_id', [myId, opponent.player_id]);
                            await startMatchmakingAsHost(opponent);
                        }
                        // else: opponent already handled it, do nothing
                    }, 2000);
                }
            }, 1500);
        }

        async function startMatchmakingAsHost(opponent) {
            const roomId = generateRoomId();
            const puzzleData = generateSudoku(gameState.difficulty, gameState.timeLimit);

            onlineState.roomId     = roomId;
            onlineState.playerSlot = 1;
            onlineState.isHost     = true;
            onlineState.appliedMoves = new Set();
            onlineState._puzzleData  = puzzleData;

            const roomData = {
                id: roomId,
                state: {
                    puzzle:      puzzleData.puzzle,
                    solution:    puzzleData.solution,
                    timeLimit:   gameState.timeLimit,
                    difficulty:  gameState.difficulty,
                    gameMode:    gameState.gameMode,
                    status:      'playing',    // go straight to playing — no waiting
                    p1Name:      playerData.settings.username,
                    p2Name:      opponent.player_name,
                    matchmade:   true,
                    scores:      { p1: 0, p2: 0 },
                    currentPlayer: 1,
                    moves:       [],
                },
                updated_at: new Date().toISOString()
            };

            await supabaseClient.from('sudoku_rooms').upsert(roomData);

            // Tell the guest which room to join via the queue match signal
            await supabaseClient.from('matchmaking_queue').insert({
                player_id:   opponent.player_id + '_match',
                player_name: roomId,   // room code stored in player_name field as signal
                rating:      0,
                time_limit:  0,
                game_mode:   'signal',
                difficulty:  'signal',
                joined_at:   new Date().toISOString(),
            }).select();

            subscribeToRoom(roomId);
            hideWaitingOverlay();
            startOnlineGame(puzzleData, roomData.state, 1);
            vibrate([50, 30, 100]);
            showToast(`⚔ Matched with ${opponent.player_name}!`, 2500);
        }

        async function startMatchmakingAsGuest(opponent) {
            // Poll for the signal row that tells us which room to join
            let attempts = 0;
            const signalId = opponent.player_id + '_match';

            const checkSignal = setInterval(async () => {
                attempts++;
                const { data } = await supabaseClient
                    .from('matchmaking_queue')
                    .select('player_name')
                    .eq('player_id', signalId)
                    .single();

                if (data?.player_name) {
                    clearInterval(checkSignal);
                    const roomId = data.player_name;
                    // Clean up signal
                    await supabaseClient.from('matchmaking_queue').delete().eq('player_id', signalId);
                    hideWaitingOverlay();
                    await joinOnlineRoom(roomId);
                    showToast(`⚔ Matched with ${opponent.player_name}!`, 2500);
                } else if (attempts > 10) {
                    clearInterval(checkSignal);
                    // Host didn't respond — try finding again
                    showToast('Match lost, searching again…', 2000);
                    setTimeout(findOpponent, 2000);
                }
            }, 800);
        }

        async function leaveMatchmakingQueue() {
            if (!supabaseClient || !onlineState._myMMId) return;
            try {
                await supabaseClient.from('matchmaking_queue')
                    .delete().eq('player_id', onlineState._myMMId);
                // Also clean up signal row if any
                await supabaseClient.from('matchmaking_queue')
                    .delete().eq('player_id', onlineState._myMMId + '_match');
            } catch(e) { /* ignore */ }
            onlineState._myMMId = null;
            // Reset waiting UI back to normal room mode
            document.getElementById('waiting-room-section').style.display = 'block';
            document.getElementById('waiting-sub').style.display = 'block';
            document.getElementById('matchmaking-status').style.display = 'none';
        }

        async function createOnlineRoom() {
            if (!supabaseClient) return;
            const roomId = generateRoomId();
            const puzzleData = generateSudoku(gameState.difficulty, gameState.timeLimit);
            onlineState.roomId = roomId;
            onlineState.playerSlot = 1;
            onlineState.isHost = true;
            onlineState.appliedMoves = new Set();
            onlineState._puzzleData = puzzleData;

            const roomData = {
                id: roomId,
                state: {
                    puzzle: puzzleData.puzzle,
                    solution: puzzleData.solution,
                    timeLimit: gameState.timeLimit,
                    difficulty: gameState.difficulty,
                    gameMode: gameState.gameMode,   // ← save mode so guest uses same
                    status: 'waiting',
                    p1Name: playerData.settings.username,
                    p2Name: null,
                    scores: { p1: 0, p2: 0 },
                    currentPlayer: 1,               // ← track whose turn it is
                    moves: [],
                    variant: gameState.variant || 'classic',
                },
                updated_at: new Date().toISOString()
            };

            const { error } = await supabaseClient.from('sudoku_rooms').upsert(roomData);
            if (error) { alert('Error creating room: ' + error.message); return; }
            showWaitingOverlay(roomId);
            subscribeToRoom(roomId);
        }

        async function joinOnlineRoom(roomId) {
            if (!supabaseClient) return;
            roomId = roomId.toUpperCase().trim();
            const { data, error } = await supabaseClient
                .from('sudoku_rooms').select('*').eq('id', roomId).single();
            if (error || !data) {
                document.getElementById('join-error').textContent = 'Room not found. Check the code.';
                return;
            }
            if (data.state.status !== 'waiting') {
                document.getElementById('join-error').textContent = 'This room is no longer available.';
                return;
            }
            onlineState.roomId = roomId;
            onlineState.playerSlot = 2;
            onlineState.isHost = false;
            onlineState.appliedMoves = new Set();

            const puzzleData = { puzzle: data.state.puzzle, solution: data.state.solution };
            onlineState._puzzleData = puzzleData;
            // Restore variant from room so both players use same rules
            if (data.state.variant) gameState.variant = data.state.variant;

            const updatedState = { ...data.state, status: 'playing', p2Name: playerData.settings.username };
            await supabaseClient.from('sudoku_rooms')
                .update({ state: updatedState, updated_at: new Date().toISOString() })
                .eq('id', roomId);

            document.getElementById('join-room-modal').classList.remove('active');
            subscribeToRoom(roomId);
            startOnlineGame(puzzleData, data.state, 2);
        }

        function subscribeToRoom(roomId) {
            if (onlineState.subscription) supabaseClient.removeChannel(onlineState.subscription);
            onlineState.subscription = supabaseClient
                .channel('room-' + roomId)
                .on('postgres_changes', {
                    event: 'UPDATE', schema: 'public',
                    table: 'sudoku_rooms', filter: 'id=eq.' + roomId
                }, (payload) => handleRoomUpdate(payload.new.state))
                .subscribe((status) => {
                    console.log('[Realtime] subscription status:', status);
                });

            // Polling fallback — checks every 2s in case realtime is not enabled
            // on the Supabase project (requires replication to be turned on)
            if (onlineState._pollInterval) clearInterval(onlineState._pollInterval);
            onlineState._pollInterval = setInterval(async () => {
                if (!onlineState.roomId) { clearInterval(onlineState._pollInterval); return; }
                if (gameState.isRunning) { clearInterval(onlineState._pollInterval); return; }
                try {
                    const { data } = await supabaseClient
                        .from('sudoku_rooms').select('state').eq('id', roomId).single();
                    if (data?.state) handleRoomUpdate(data.state);
                } catch(e) { /* ignore */ }
            }, 2000);
        }

        function handleRoomUpdate(remoteState) {
            // Host: detect when guest joins and start game
            if (onlineState.isHost && remoteState.status === 'playing' && !gameState.isRunning) {
                if (onlineState._pollInterval) { clearInterval(onlineState._pollInterval); onlineState._pollInterval = null; }
                hideWaitingOverlay();
                startOnlineGame(onlineState._puzzleData, remoteState, 1);
                vibrate([50, 30, 100]);
                return;
            }

            // Opponent resigned — end the game for us as winner
            if (remoteState.status === 'resigned' && gameState.isRunning) {
                if (remoteState.resignedBy !== onlineState.playerSlot) {
                    // The OTHER player resigned — we win
                    gameState.isRunning = false;
                    endGame(1, 'resign');
                    return;
                }
            }

            if (!gameState.isRunning) return;

            // Sync turn for pass & play
            if (gameState.gameMode === 'passplay' && remoteState.currentPlayer !== undefined) {
                gameState.currentPlayer = remoteState.currentPlayer;
                updateTurnIndicator();
            }

            const opponentSlot = onlineState.playerSlot === 1 ? 2 : 1;
            (remoteState.moves || []).forEach(move => {
                const key = move.t + '-' + move.row + '-' + move.col;
                if (move.player === opponentSlot && !onlineState.appliedMoves.has(key)) {
                    onlineState.appliedMoves.add(key);
                    if (gameState.claims[move.row][move.col] === 0) {
                        claimCell(move.row, move.col, move.number, opponentSlot);
                        // In pass & play, opponent's move hands turn back to us
                        if (gameState.gameMode === 'passplay') {
                            gameState.currentPlayer = onlineState.playerSlot;
                            updateTurnIndicator();
                        }
                        updateRemainingCounts();
                        vibrate(30);
                        checkGameEnd();
                    }
                }
            });
            gameState.scores.p1 = remoteState.scores.p1 || gameState.scores.p1;
            gameState.scores.p2 = remoteState.scores.p2 || gameState.scores.p2;
            updateScores();
        }

        async function pushMoveOnline(row, col, number) {
            if (!supabaseClient || !onlineState.roomId) return;
            const { data } = await supabaseClient
                .from('sudoku_rooms').select('state').eq('id', onlineState.roomId).single();
            if (!data) return;
            const state = data.state;
            const moveEntry = { player: onlineState.playerSlot, row, col, number, t: Date.now() };
            state.moves = [...(state.moves || []), moveEntry];
            state.scores = { p1: gameState.scores.p1, p2: gameState.scores.p2 };
            // In pass & play, hand turn to the opponent after our move
            if (gameState.gameMode === 'passplay') {
                const opponentSlot = onlineState.playerSlot === 1 ? 2 : 1;
                state.currentPlayer = opponentSlot;
            }
            await supabaseClient.from('sudoku_rooms')
                .update({ state, updated_at: new Date().toISOString() })
                .eq('id', onlineState.roomId);
        }

        function startOnlineGame(puzzleData, roomState, mySlot) {
            gameState.puzzle = puzzleData.puzzle.map(r => [...r]);
            gameState.solution = puzzleData.solution.map(r => [...r]);
            gameState.claims = Array(9).fill(null).map(() => Array(9).fill(0));
            gameState.pencilMarks = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));
            for (let r = 0; r < 9; r++)
                for (let c = 0; c < 9; c++)
                    if (gameState.puzzle[r][c] !== 0) gameState.claims[r][c] = -1;

            gameState.timeRemaining = roomState.timeLimit || 600;
            gameState.p1Time = gameState.timeRemaining;
            gameState.p2Time = gameState.timeRemaining;
            gameState.scores = { p1: 0, p2: 0 };
            gameState.isRunning = true;
            gameState.isPaused = false;
            gameState.selectedCell = null;
            gameState.lastMoveCell = null;
            gameState.animatingCells.clear();
            gameState.lastTick = Date.now();
            gameState.wrongMoves = 0;
            gameState.errorCell = null;
            gameState.highlightNumber = null;
            gameState.floatingScores = [];
            gameState.vsAI = false;

            // Use the mode the host selected — NOT forced simultaneous
            gameState.gameMode = roomState.gameMode || 'simultaneous';

            // In pass & play: host (slot 1) goes first, guest (slot 2) waits
            // currentPlayer tracks which slot's turn it is (1 or 2 = player slot, not P1/P2 label)
            // We map: slot 1 = currentPlayer 1, slot 2 = currentPlayer 2
            if (gameState.gameMode === 'passplay') {
                gameState.currentPlayer = roomState.currentPlayer || 1;
            } else {
                gameState.currentPlayer = 1;
            }

            onlineState.playerSlot = mySlot;

            updateWrongMovesDisplay();
            updateTimerDisplay();
            updateScores();
            updateTurnIndicator();

            // Show whose turn it is clearly for online pass & play
            if (gameState.gameMode === 'passplay') {
                const myTurn = gameState.currentPlayer === mySlot;
                showToast(myTurn ? '▶ Your turn first!' : '⏳ Opponent goes first…', 2500);
            }

            const oppName = mySlot === 1 ? (roomState.p2Name || 'Opponent') : (roomState.p1Name || 'Opponent');
            // Stash opponent rating for post-game Elo — falls back to 3.0 if not supplied
            onlineState._opponentRating = mySlot === 1
                ? (roomState.p2Rating ?? null)
                : (roomState.p1Rating ?? null);
            document.getElementById('opponent-name').textContent = oppName;
            document.getElementById('opponent-rating').textContent = 'Online';
            document.getElementById('ai-indicator').classList.remove('active');
            document.getElementById('online-badge').classList.add('active');

            lobby.style.display = 'none';
            gameScreen.classList.add('active');
            resizeCanvas();
            markGridDirty();
            drawGrid();
            updateRemainingCounts();
            requestAnimationFrame(gameLoop);
            vibrate([50, 30, 50]);
        }

        function showWaitingOverlay(roomId) {
            document.getElementById('waiting-room-code').textContent = roomId;
            document.getElementById('share-link-input').value = getShareLink(roomId);
            document.getElementById('waiting-overlay').classList.add('active');
        }

        function hideWaitingOverlay() {
            document.getElementById('waiting-overlay').classList.remove('active');
        }

        function shareResult() {
            const p1 = gameState.scores.p1, p2 = gameState.scores.p2;
            const won = p1 > p2;
            const txt = `🧩 Sudoku.game — I ${won?'won':'lost'} ${p1}–${p2} in competitive Sudoku! Challenge me: ${window.location.href.split('?')[0]}`;
            if (navigator.share) {
                navigator.share({ title: 'Sudoku.game', text: txt });
            } else {
                navigator.clipboard.writeText(txt).then(() => {
                    const btn = document.getElementById('share-result-btn');
                    btn.textContent = '✓ Copied!';
                    setTimeout(() => btn.textContent = '📤 Share Result', 2000);
                });
            }
            vibrate(40);
        }

        function setupOnlineListeners() {
            document.getElementById('sb-connect-btn').addEventListener('click', connectSupabase);
            document.getElementById('create-room-btn').addEventListener('click', createOnlineRoom);
            document.getElementById('find-opponent-btn').addEventListener('click', findOpponent);

            document.getElementById('join-room-btn').addEventListener('click', () => {
                document.getElementById('join-code-input').value = '';
                document.getElementById('join-error').textContent = '';
                document.getElementById('join-room-modal').classList.add('active');
            });

            document.getElementById('join-confirm-btn').addEventListener('click', () => {
                const code = document.getElementById('join-code-input').value;
                if (code.length < 6) {
                    document.getElementById('join-error').textContent = 'Please enter the full 6-character code.';
                    return;
                }
                joinOnlineRoom(code);
            });

            document.getElementById('join-cancel-btn').addEventListener('click', () =>
                document.getElementById('join-room-modal').classList.remove('active'));

            document.getElementById('cancel-waiting-btn').addEventListener('click', () => {
                hideWaitingOverlay();
                leaveMatchmakingQueue();
                if (supabaseClient && onlineState.subscription)
                    supabaseClient.removeChannel(onlineState.subscription);
                if (onlineState._pollInterval) { clearInterval(onlineState._pollInterval); onlineState._pollInterval = null; }
                if (onlineState._mmInterval)   { clearInterval(onlineState._mmInterval);   onlineState._mmInterval   = null; }
                onlineState.roomId = null;
            });

            document.getElementById('share-copy-btn').addEventListener('click', () => {
                const link = document.getElementById('share-link-input').value;
                navigator.clipboard.writeText(link).then(() => {
                    const btn = document.getElementById('share-copy-btn');
                    btn.textContent = '✓ Copied!';
                    btn.classList.add('copied');
                    setTimeout(() => { btn.textContent = 'Copy Link'; btn.classList.remove('copied'); }, 2000);
                });
                vibrate(40);
            });

            document.getElementById('share-result-btn').addEventListener('click', shareResult);

            // Keyboard confirm on join input
            document.getElementById('join-code-input').addEventListener('keydown', e => {
                if (e.key === 'Enter') document.getElementById('join-confirm-btn').click();
            });

            // Auto-join from URL ?room=XXXXXX
            const urlRoom = new URLSearchParams(window.location.search).get('room');
            if (urlRoom) {
                const tryJoin = setInterval(() => {
                    if (supabaseClient && onlineState.enabled) {
                        clearInterval(tryJoin);
                        document.getElementById('join-code-input').value = urlRoom.toUpperCase();
                        joinOnlineRoom(urlRoom);
                    }
                }, 400);
                // Show join modal immediately as placeholder
                setTimeout(() => {
                    if (!gameState.isRunning) {
                        document.getElementById('join-code-input').value = urlRoom.toUpperCase();
                        document.getElementById('join-room-modal').classList.add('active');
                    }
                }, 600);
            }
        }

        // Patch makeMove to push online moves, enforce turns, vibrate, and save state
        const _origMakeMove = makeMove;
        makeMove = function(number) {
            if (!gameState.selectedCell) return;
            const { row, col } = gameState.selectedCell;
            if (gameState.claims[row][col] !== 0) return;

            // Online pass & play: block if it's not our turn
            if (onlineState.roomId && gameState.gameMode === 'passplay') {
                if (gameState.currentPlayer !== onlineState.playerSlot) {
                    showToast('⏳ Not your turn yet', 1200);
                    vibrate([40, 20, 40]);
                    return;
                }
            }

            const correct = gameState.solution[row][col] === number;
            if (!correct) vibrate([80, 40, 80]);
            _origMakeMove(number);
            if (correct) {
                if (onlineState.roomId) pushMoveOnline(row, col, number);
                vibrate(35);
                saveOngoingGame(); // keep save fresh after every claim
            }
        };

        // Patch endGame to vibrate on result and clear ongoing save
        const _origEndGame = endGame;
        endGame = function(winner, reason) {
            clearOngoingGame();
            hideOngoingIcon();
            if (winner === 1) vibrate([80, 40, 80, 40, 200]);
            else if (winner === 2) vibrate([300]);
            _origEndGame(winner, reason);
            document.getElementById('online-badge').classList.remove('active');
            // Save to cloud for any game when signed in (online, AI, solo, puzzle)
            if (currentUser && supabaseClient) {
                const result = winner === 1 ? 'win' : winner === 2 ? 'loss' : 'draw';
                const oppName = gameState.vsAI
                    ? ('AI ' + (gameState.aiDifficulty || 'medium'))
                    : (document.getElementById('opponent-name')?.textContent || 'Local');
                saveGameToCloud(result, gameState.scores.p1, gameState.scores.p2, oppName);
            }
        };

        // ============================================
        // ============================================
        // AUTH MODULE (Supabase Auth)
        // ============================================
        let currentUser = null;
        let currentProfile = null;
        let authMode = 'signin'; // 'signin' | 'signup'

        async function initAuth() {
            if (!supabaseClient) return;

            // onAuthStateChange fires immediately with INITIAL_SESSION if a session exists.
            // We rely on this single path to avoid race conditions with getSession().
            supabaseClient.auth.onAuthStateChange(async (event, session) => {
                console.log('[Auth] event:', event, session?.user?.email);
                currentUser = session?.user || null;

                if (currentUser) {
                    // Immediately update UI with what we know
                    const quickName = currentUser.user_metadata?.username
                        || currentUser.email?.split('@')[0]
                        || 'Player';
                    const authBtn  = document.getElementById('side-auth-btn');
                    const signoutBtn = document.getElementById('side-signout-btn');
                    document.getElementById('menu-username').textContent = quickName;
                    document.getElementById('menu-avatar').textContent = quickName[0].toUpperCase();
                    if (authBtn) { authBtn.textContent = quickName; authBtn.classList.add('signed-in'); }
                    if (signoutBtn) signoutBtn.style.display = 'flex';

                    // Load full profile in background
                    await loadProfile(currentUser.id);
                    onAuthSuccess();
                } else {
                    currentProfile = null;
                    onAuthSignOut();
                    // Show sign-in prompt on first visit (only on SIGNED_OUT, not INITIAL_SESSION with no user)
                    if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
                        if (!localStorage.getItem('sudoku_auth_skipped')) {
                            setTimeout(() => openAuthModal(), 1400);
                        }
                    }
                }
            });
        }

        async function loadProfile(userId) {
            if (!supabaseClient) return;
            const { data } = await supabaseClient
                .from('profiles').select('*').eq('id', userId).single();
            if (data) {
                currentProfile = data;
                playerData.settings.username = data.username;
                playerData.rating = data.rating;
                playerData.stats = {
                    gamesPlayed: data.games_played,
                    wins: data.wins,
                    losses: data.losses,
                    draws: data.draws,
                    bestStreak: data.best_streak,
                };
                savePlayerData();
                updateAuthUI(true); // re-apply now that profile is loaded
                updateUIWithProfile();
            }
        }

        function onAuthSuccess() {
            updateAuthUI(true); // immediate update with currentUser data
            loadLeaderboard();
            loadFriends();
            loadGameHistory();
        }

        function onAuthSignOut() {
            updateAuthUI(false);
        }

        function updateAuthUI(isSignedIn) {
            const authBtn = document.getElementById('side-auth-btn');
            const signoutBtn = document.getElementById('side-signout-btn');
            if (!authBtn) return;
            if (isSignedIn && currentUser) {
                // Use profile username if loaded, else fall back to email prefix or metadata
                const displayName = currentProfile?.username
                    || currentUser.user_metadata?.username
                    || currentUser.email?.split('@')[0]
                    || 'Player';
                const rating = currentProfile?.rating ?? playerData.rating ?? 2.0;
                authBtn.textContent = displayName;
                authBtn.classList.add('signed-in');
                if (signoutBtn) signoutBtn.style.display = 'flex';
                document.getElementById('menu-avatar').textContent =
                    (currentProfile?.avatar_emoji) || displayName[0].toUpperCase();
                document.getElementById('menu-username').textContent = displayName;
                document.getElementById('menu-rating').textContent = 'Rating: ' + rating.toFixed(1);
            } else {
                authBtn.textContent = 'Sign In';
                authBtn.classList.remove('signed-in');
                if (signoutBtn) signoutBtn.style.display = 'none';
            }
        }

        function updateUIWithProfile() {
            updateAllDisplays(); // updateAllDisplays now reads currentProfile directly
        }

        function openAuthModal() {
            document.getElementById('auth-modal').classList.add('active');
            authMode = 'signin';
            document.getElementById('auth-title').textContent = 'Welcome back';
            document.getElementById('auth-subtitle').textContent = 'Sign in to save your rating';
            document.getElementById('auth-submit-btn').textContent = 'Sign In';
            document.getElementById('auth-toggle-btn').textContent = 'No account? Sign Up';
            document.getElementById('auth-username-row').style.display = 'none';
            document.getElementById('auth-error').textContent = '';
        }

        function setupAuthListeners() {
            document.getElementById('side-auth-btn').addEventListener('click', () => {
                if (currentUser) {
                    // Already signed in — go to profile
                    document.querySelector('[data-page="profile"]').click();
                } else {
                    openAuthModal();
                }
                document.getElementById('side-menu').classList.remove('active');
                document.getElementById('side-menu-overlay').classList.remove('active');
            });

            document.getElementById('side-signout-btn').addEventListener('click', async () => {
                await supabaseClient.auth.signOut();
                document.getElementById('side-menu').classList.remove('active');
                document.getElementById('side-menu-overlay').classList.remove('active');
            });

            document.getElementById('auth-toggle-btn').addEventListener('click', () => {
                authMode = authMode === 'signin' ? 'signup' : 'signin';
                const isSignup = authMode === 'signup';
                document.getElementById('auth-title').textContent = isSignup ? 'Create Account' : 'Welcome back';
                document.getElementById('auth-subtitle').textContent = isSignup
                    ? 'Join and track your rating globally' : 'Sign in to save your rating';
                document.getElementById('auth-submit-btn').textContent = isSignup ? 'Create Account' : 'Sign In';
                document.getElementById('auth-toggle-btn').textContent = isSignup ? 'Have an account? Sign In' : 'No account? Sign Up';
                document.getElementById('auth-username-row').style.display = isSignup ? 'block' : 'none';
                document.getElementById('auth-error').textContent = '';
            });

            document.getElementById('auth-submit-btn').addEventListener('click', handleAuthSubmit);
            document.getElementById('auth-skip-btn').addEventListener('click', () => {
                localStorage.setItem('sudoku_auth_skipped', '1');
                document.getElementById('auth-modal').classList.remove('active');
            });

            // Enter key submits
            ['auth-email','auth-password','auth-username'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleAuthSubmit(); });
            });
        }

        async function handleAuthSubmit() {
            const email = document.getElementById('auth-email').value.trim();
            const password = document.getElementById('auth-password').value;
            const errEl = document.getElementById('auth-error');
            const btn = document.getElementById('auth-submit-btn');

            if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
            if (password.length < 6) { errEl.textContent = 'Password must be 6+ characters.'; return; }

            btn.textContent = '…';
            btn.disabled = true;
            errEl.textContent = '';

            try {
                if (authMode === 'signup') {
                    const username = document.getElementById('auth-username').value.trim();
                    if (!username) { errEl.textContent = 'Choose a username.'; btn.textContent = 'Create Account'; btn.disabled = false; return; }
                    if (username.length < 3) { errEl.textContent = 'Username must be 3+ characters.'; btn.textContent = 'Create Account'; btn.disabled = false; return; }

                    // Check username taken
                    const { data: existing } = await supabaseClient
                        .from('profiles').select('id').eq('username', username).maybeSingle();
                    if (existing) { errEl.textContent = 'Username taken. Try another.'; btn.textContent = 'Create Account'; btn.disabled = false; return; }

                    const { error } = await supabaseClient.auth.signUp({
                        email, password,
                        options: { data: { username } }
                    });
                    if (error) throw error;
                    errEl.style.color = '#56d364';
                    errEl.textContent = '✓ Account created! Check your email to confirm.';
                } else {
                    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    document.getElementById('auth-modal').classList.remove('active');
                }
            } catch (e) {
                errEl.style.color = 'var(--accent-red)';
                errEl.textContent = e.message || 'Something went wrong.';
            }

            btn.disabled = false;
            btn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
        }

        // ============================================
        // CLOUD GAME HISTORY
        // ============================================
        async function saveGameToCloud(result, myScore, oppScore, oppName) {
            if (!supabaseClient || !currentUser) return;

            // Determine which TC column this game belongs to
            const tl = gameState.timeLimit;
            const tcCol = (!tl || tl === Infinity) ? null
                        : tl <= 120  ? 'bullet_rating'
                        : tl <= 300  ? 'blitz_rating'
                        : tl <= 600  ? 'rapid_rating'
                        : tl <= 900  ? 'rapid_rating'
                        :              'classical_rating';

            const ratingBefore = tcCol ? (currentProfile?.[tcCol] ?? 2.0) : 2.0;
            // playerData.rating holds the new computed rating from recordGame()
            const ratingAfter  = playerData.rating;

            try {
                await supabaseClient.from('game_history').insert({
                    player_id:    currentUser.id,
                    opponent_name: oppName,
                    result,
                    my_score:     myScore,
                    opp_score:    oppScore,
                    game_mode:    gameState.gameMode,
                    time_control: gameState.timeLimit,
                    rating_before: ratingBefore,
                    rating_after:  ratingAfter,
                });

                // Build update — only touch the TC column that was actually played
                const update = {
                    games_played: (currentProfile?.games_played || 0) + 1,
                    wins:         (currentProfile?.wins   || 0) + (result === 'win'  ? 1 : 0),
                    losses:       (currentProfile?.losses || 0) + (result === 'loss' ? 1 : 0),
                    draws:        (currentProfile?.draws  || 0) + (result === 'draw' ? 1 : 0),
                    best_streak:  Math.max(currentProfile?.best_streak || 0, playerData.stats?.currentStreak || 0),
                    updated_at:   new Date().toISOString(),
                };
                // Also keep overall `rating` as the highest TC rating for backward compat
                if (tcCol) {
                    update[tcCol] = ratingAfter;
                    // overall rating = max of all TC ratings after update
                    const allTc = ['bullet_rating','blitz_rating','rapid_rating','classical_rating'];
                    const maxRating = Math.max(ratingAfter, ...allTc
                        .filter(c => c !== tcCol)
                        .map(c => currentProfile?.[c] ?? 2.0));
                    update.rating = maxRating;
                }

                // Sync puzzle XP from localStorage
                const localProgress = JSON.parse(localStorage.getItem('sudoku_technique_progress') || '{}');
                const localXP = Object.values(localProgress).reduce((s, p) => s + (p.xp || 0), 0);
                const puzzleXP = Math.max(localXP, currentProfile?.puzzle_xp || 0);
                update.puzzle_xp   = puzzleXP;
                update.puzzle_rank = puzzleXP >= 300 ? 'Grandmaster'
                                   : puzzleXP >= 150 ? 'Expert'
                                   : puzzleXP >= 70  ? 'Advanced'
                                   : puzzleXP >= 25  ? 'Intermediate' : 'Beginner';

                await supabaseClient.from('profiles').update(update).eq('id', currentUser.id);
                await loadProfile(currentUser.id);
            } catch(e) { console.warn('Cloud save failed:', e); }
        }

        async function loadGameHistory() {
            if (!supabaseClient || !currentUser) return;
            const { data } = await supabaseClient
                .from('game_history')
                .select('*')
                .eq('player_id', currentUser.id)
                .order('played_at', { ascending: false })
                .limit(50);
            if (!data) return;
            renderCloudHistory(data);
        }

        function renderCloudHistory(games) {
            const list = document.getElementById('history-list');
            if (!list || games.length === 0) return;
            list.innerHTML = '';
            games.forEach(g => {
                const el = document.createElement('div');
                el.className = 'history-item';
                const resultColor = g.result === 'win' ? '#56d364' : g.result === 'loss' ? '#f05a5a' : '#d59020';
                const date = new Date(g.played_at).toLocaleDateString();
                el.innerHTML = `
                    <div class="history-result" style="color:${resultColor}">${g.result.toUpperCase()}</div>
                    <div class="history-info">
                        <div class="history-opponent">vs ${g.opponent_name || 'Opponent'}</div>
                        <div class="history-meta">${g.my_score}–${g.opp_score} · ${date}</div>
                    </div>
                    <div class="history-rating" style="color:${g.rating_after >= g.rating_before ? '#56d364' : '#f05a5a'}">
                        ${g.rating_after >= g.rating_before ? '+' : ''}${(g.rating_after - g.rating_before).toFixed(1)}
                    </div>`;
                list.appendChild(el);
            });
        }

        // ============================================
        // LEADERBOARD (Real players)
        // ============================================
        async function loadLeaderboard(tc) {
            if (!supabaseClient) return;
            tc = tc || _activeLbTab || 'bullet';
            _activeLbTab = tc;

            const tcCol = tc === 'blitz' ? 'blitz_rating' : tc === 'rapid' ? 'rapid_rating'
                        : tc === 'classical' ? 'classical_rating' : 'bullet_rating';
            const tcLabel = { bullet:'Bullet', blitz:'Blitz', rapid:'Rapid', classical:'Classical' }[tc];

            // Update tab active state
            document.querySelectorAll('.friends-tab[data-lb]').forEach(t => {
                t.classList.toggle('active', t.dataset.lb === tc);
            });

            const list = document.getElementById('leaderboard-list');
            if (!list) return;
            list.innerHTML = '<div class="empty-state" style="color:#555;">Loading…</div>';

            const { data } = await supabaseClient
                .from('profiles')
                .select(`id, username, avatar_url, avatar_emoji, games_played, wins, ${tcCol}`)
                .order(tcCol, { ascending: false })
                .limit(50);

            if (!data || data.length === 0) {
                list.innerHTML = '<div class="empty-state">No ' + tcLabel + ' games played yet.</div>';
                return;
            }

            list.innerHTML = '';
            data.forEach((p, i) => {
                const isMe = currentProfile && p.id === currentProfile.id;
                const el = document.createElement('div');
                el.className = 'leaderboard-item' + (isMe ? ' leaderboard-me' : '');
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;
                const avHtml = p.avatar_url
                    ? `<img src="${p.avatar_url}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" loading="lazy">`
                    : (p.avatar_emoji || p.username[0].toUpperCase());
                el.style.cursor = 'pointer';
                el.innerHTML = `
                    <div class="lb-rank">${medal}</div>
                    <div class="lb-avatar">${avHtml}</div>
                    <div class="lb-info">
                        <div class="lb-name">${p.username}${isMe ? ' (you)' : ''}</div>
                        <div class="lb-games">${p.wins || 0}W · ${p.games_played || 0} games</div>
                    </div>
                    <div class="lb-rating">${(p[tcCol] || 2.0).toFixed(1)}</div>`;
                el.addEventListener('click', () => viewPlayerProfile(p.id));
                list.appendChild(el);
            });
        }

        // ============================================
        // FRIENDS SYSTEM
        // ============================================
        async function loadFriends() {
            const list = document.getElementById('friends-list');
            if (!supabaseClient || !currentUser) {
                if (list) list.innerHTML = '<div class="empty-state" style="color:#555;">Sign in to see your friends</div>';
                return;
            }
            if (list) list.innerHTML = '<div class="empty-state" style="color:#555;">Loading…</div>';
            const { data } = await supabaseClient
                .from('friendships')
                .select(`
                    id, status, requester_id, addressee_id,
                    requester:profiles!friendships_requester_id_fkey(id, username, rating, avatar_emoji, last_seen),
                    addressee:profiles!friendships_addressee_id_fkey(id, username, rating, avatar_emoji, last_seen)
                `)
                .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);
            if (!data) return;

            const accepted = data.filter(f => f.status === 'accepted');
            const pending  = data.filter(f => f.status === 'pending' && f.addressee_id === currentUser.id);

            // Badge count — side menu friends badge
            const badge = document.getElementById('friends-badge');
            if (badge) {
                badge.textContent = pending.length;
                badge.style.display = pending.length > 0 ? 'inline' : 'none';
            }
            const notifBadge = document.getElementById('notif-badge');
            if (notifBadge) {
                notifBadge.textContent = pending.length;
                notifBadge.style.display = pending.length > 0 ? 'inline' : 'none';
            }

            renderFriendsList(accepted);
            renderPendingList(pending);
        }

        function formatLastSeen(lastSeen) {
            if (!lastSeen) return 'Never seen';
            const diff = Date.now() - new Date(lastSeen).getTime();
            const mins = Math.floor(diff / 60000);
            const hrs  = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            if (mins < 2)   return 'Just now';
            if (mins < 60)  return mins + 'm ago';
            if (hrs  < 24)  return hrs  + 'h ago';
            if (days < 7)   return days + 'd ago';
            return new Date(lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }


        // ============================================================
        // PLAYER PROFILE VIEWER
        // ============================================================
        async function viewPlayerProfile(userId) {
            if (!supabaseClient) return;
            const modal = document.getElementById('player-profile-modal');
            if (!modal) return;
            modal.classList.add('active');

            ['pp-username','pp-bullet','pp-blitz','pp-rapid','pp-classical',
             'pp-wins','pp-games','pp-streak','pp-winrate-pct','pp-online'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = id === 'pp-username' ? 'Loading…' : '—';
            });
            const avatarEl = document.getElementById('pp-avatar');
            if (avatarEl) avatarEl.textContent = '…';
            const barEl = document.getElementById('pp-winrate-bar');
            if (barEl) barEl.style.width = '0%';
            const actionsEl = document.getElementById('pp-actions');
            if (actionsEl) actionsEl.innerHTML = '';

            const { data: p, error } = await supabaseClient
                .from('profiles')
                .select('id, username, avatar_emoji, rating, wins, games_played, current_streak, bullet_rating, blitz_rating, rapid_rating, classical_rating')
                .eq('id', userId).single();

            if (error || !p) {
                const { data: basic } = await supabaseClient.from('profiles')
                    .select('id, username, avatar_emoji, rating, wins, games_played').eq('id', userId).single();
                if (!basic) { document.getElementById('pp-username').textContent = 'Could not load profile'; return; }
                document.getElementById('pp-username').textContent = basic.username;
                if (avatarEl) avatarEl.textContent = basic.avatar_emoji || basic.username[0].toUpperCase();
                document.getElementById('pp-wins').textContent  = basic.wins || 0;
                document.getElementById('pp-games').textContent = basic.games_played || 0;
                ['pp-bullet','pp-blitz','pp-rapid','pp-classical'].forEach(id => {
                    const el = document.getElementById(id); if (el) el.textContent = (basic.rating || 2.0).toFixed(1);
                });
                const wr = basic.games_played > 0 ? Math.round((basic.wins/basic.games_played)*100) : 0;
                document.getElementById('pp-winrate-pct').textContent = wr + '%';
                setTimeout(() => { if (barEl) barEl.style.width = wr + '%'; }, 100);
                return;
            }

            if (avatarEl) avatarEl.textContent = p.avatar_emoji || p.username[0].toUpperCase();
            document.getElementById('pp-username').textContent    = p.username;
            document.getElementById('pp-bullet').textContent      = (p.bullet_rating    || 2.0).toFixed(1);
            document.getElementById('pp-blitz').textContent       = (p.blitz_rating     || 2.0).toFixed(1);
            document.getElementById('pp-rapid').textContent       = (p.rapid_rating     || 2.0).toFixed(1);
            document.getElementById('pp-classical').textContent   = (p.classical_rating || 2.0).toFixed(1);
            document.getElementById('pp-wins').textContent        = p.wins || 0;
            document.getElementById('pp-games').textContent       = p.games_played || 0;
            document.getElementById('pp-streak').textContent      = (p.current_streak || 0) + '🔥';

            const winRate = p.games_played > 0 ? Math.round((p.wins/p.games_played)*100) : 0;
            document.getElementById('pp-winrate-pct').textContent = winRate + '%';
            setTimeout(() => { if (barEl) barEl.style.width = winRate + '%'; }, 100);

            const isOnline = _onlineUserIds && _onlineUserIds.has(userId);
            const onlineEl = document.getElementById('pp-online');
            if (onlineEl) { onlineEl.textContent = isOnline ? '● Online now' : '○ Offline'; onlineEl.style.color = isOnline ? '#56d364' : '#555'; }

            if (actionsEl && currentUser && userId !== currentUser.id) {
                const { data: friendship } = await supabaseClient.from('friendships').select('id, status')
                    .or(`and(requester_id.eq.${currentUser.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${currentUser.id})`)
                    .maybeSingle();
                const btn = document.createElement('button');
                btn.style.cssText = 'flex:1;margin:0;';
                if (!friendship) {
                    btn.className = 'action-btn btn-secondary'; btn.textContent = '+ Add Friend';
                    btn.onclick = async () => { await sendFriendRequest(userId, p.username); btn.textContent = '✓ Sent'; btn.disabled = true; };
                } else if (friendship.status === 'accepted') {
                    btn.className = 'action-btn btn-primary'; btn.textContent = '⚔ Challenge';
                    btn.onclick = () => { modal.classList.remove('active'); challengeFriend(p); };
                } else {
                    btn.className = 'action-btn btn-secondary'; btn.textContent = '⏳ Request Pending'; btn.disabled = true;
                }
                actionsEl.appendChild(btn);
            }
        }
        window.viewPlayerProfile = viewPlayerProfile;

        function makeFriendCard(profile, actions) {
            const isOnline = _onlineUserIds.has(profile.id);
            const el = document.createElement('div');
            el.className = 'friend-card';
            el.innerHTML = `
                <div class="friend-avatar-wrap" style="cursor:pointer;" onclick="viewPlayerProfile('${profile.id}')">
                    <div class="friend-avatar">${profile.avatar_emoji || profile.username[0].toUpperCase()}</div>
                    ${isOnline ? '<span class="online-dot"></span>' : ''}
                </div>
                <div class="friend-info" style="cursor:pointer;" onclick="viewPlayerProfile('${profile.id}')">
                    <div class="friend-name">${profile.username}</div>
                    <div class="friend-status ${isOnline ? 'online' : ''}">
                        ${isOnline ? '● Online' : '○ ' + formatLastSeen(profile.last_seen)}
                    </div>
                </div>
                <div class="friend-actions"></div>`;
            const actionsEl = el.querySelector('.friend-actions');
            actions.forEach(a => {
                const btn = document.createElement('button');
                btn.className = 'friend-btn ' + a.cls;
                btn.textContent = a.label;
                btn.addEventListener('click', a.action);
                actionsEl.appendChild(btn);
            });
            return el;
        }

        function renderFriendsList(friends) {
            const list = document.getElementById('friends-list');
            if (!list) return;
            if (friends.length === 0) {
                list.innerHTML = '<div class="empty-state">No friends yet — search by username to add someone!</div>';
                return;
            }
            list.innerHTML = '';
            friends.forEach(f => {
                const other = f.requester_id === currentUser.id ? f.addressee : f.requester;
                if (!other) return;
                const el = makeFriendCard(other, [
                    { label: '⚔ Challenge', cls: 'challenge', action: () => challengeFriend(other) },
                    { label: 'Remove', cls: 'danger', action: () => removeFriend(f.id) },
                ]);
                list.appendChild(el);
            });
        }

        function renderPendingList(pending) {
            const list = document.getElementById('pending-friends-list');
            const label = document.getElementById('pending-label');
            if (!list) return;
            if (pending.length === 0) {
                list.innerHTML = '';
                if (label) label.style.display = 'none';
                return;
            }
            if (label) label.style.display = 'block';
            list.innerHTML = '';
            pending.forEach(f => {
                const other = f.requester;
                if (!other) return;
                const el = makeFriendCard(other, [
                    { label: '✓ Accept', cls: 'accept', action: () => acceptFriend(f.id) },
                    { label: 'Decline', cls: 'danger', action: () => removeFriend(f.id) },
                ]);
                list.appendChild(el);
            });
        }

        async function searchFriend() {
            if (!supabaseClient || !currentUser) {
                showToast('Sign in to add friends', 2000);
                return;
            }
            const query = document.getElementById('friend-search-input').value.trim();
            if (!query) return;
            const { data } = await supabaseClient
                .from('profiles').select('id, username, rating, avatar_emoji')
                .ilike('username', `%${query}%`)
                .neq('id', currentUser.id)
                .limit(5);
            const results = document.getElementById('friend-search-results');
            if (!results) return;
            results.innerHTML = '';
            if (!data || data.length === 0) {
                results.innerHTML = '<div class="empty-state">No players found.</div>';
                return;
            }
            data.forEach(p => {
                const el = makeFriendCard(p, [
                    { label: '+ Add', cls: '', action: () => sendFriendRequest(p.id, p.username) },
                ]);
                results.appendChild(el);
            });
        }

        async function sendFriendRequest(addresseeId, username) {
            if (!supabaseClient || !currentUser) return;
            const { error } = await supabaseClient.from('friendships').insert({
                requester_id: currentUser.id,
                addressee_id: addresseeId,
            });
            if (error) {
                showToast(error.code === '23505' ? 'Request already sent!' : 'Error: ' + error.message, 2000);
            } else {
                showToast(`Friend request sent to ${username}!`, 2000);
                document.getElementById('friend-search-results').innerHTML = '';
                document.getElementById('friend-search-input').value = '';
            }
        }

        async function acceptFriend(friendshipId) {
            await supabaseClient.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
            loadFriends();
        }

        async function removeFriend(friendshipId) {
            await supabaseClient.from('friendships').delete().eq('id', friendshipId);
            loadFriends();
        }

        function challengeFriend(profile) {
            showToast(`Creating room to challenge ${profile.username}…`, 2000);
            // Navigate to lobby and auto-create a room
            document.querySelector('[data-page="lobby"]').click();
            setTimeout(() => {
                if (supabaseClient) createOnlineRoom();
            }, 500);
        }

        function setupFriendsListeners() {
            document.getElementById('friend-search-btn').addEventListener('click', searchFriend);
            document.getElementById('friend-search-input').addEventListener('keydown', e => {
                if (e.key === 'Enter') searchFriend();
            });
            const friendsMenuBtn = document.getElementById('friends-menu-btn');
            if (friendsMenuBtn) {
                friendsMenuBtn.addEventListener('click', () => {
                    document.getElementById('friends-page').classList.remove('active');
                    document.getElementById('lobby').style.display = 'block';
                });
            }
        }

        // ============================================
        // SPLASH SCREEN
        // ============================================
        function hideSplash() {
            const splash = document.getElementById('splash-screen');
            if (splash) {
                splash.classList.add('hidden');
                setTimeout(() => splash.remove(), 500);
            }
        }

        // ============================================
        // START
        // ============================================
        // ============================================
        // DAILY STREAK SYSTEM
        // ============================================
        function todayKey() {
            return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
        }

        function getDailyStreak() {
            const raw = localStorage.getItem('sudoku_daily_streak');
            return raw ? JSON.parse(raw) : { streak: 0, lastPlayedDate: null, bestStreak: 0 };
        }

        function saveDailyStreak(data) {
            localStorage.setItem('sudoku_daily_streak', JSON.stringify(data));
            // Sync to Supabase so streak persists across devices and reinstalls
            if (supabaseClient && currentUser) {
                supabaseClient.from('profiles').update({
                    current_streak: data.streak,
                    best_streak:    Math.max(data.bestStreak, data.streak),
                    last_played_date: data.lastPlayedDate,
                }).eq('id', currentUser.id).then(({ error }) => {
                    if (error) console.warn('[Streak] Supabase sync failed:', error.message);
                });
            }
        }

        function recordDailyGame() {
            const data   = getDailyStreak();
            const today  = todayKey();
            if (data.lastPlayedDate === today) return; // already played today

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yKey = yesterday.toISOString().slice(0, 10);

            if (data.lastPlayedDate === yKey) {
                data.streak++; // continued streak
            } else if (data.lastPlayedDate === null) {
                data.streak = 1; // first ever game
            } else {
                data.streak = 1; // streak broken, reset to 1 for today
            }

            data.bestStreak     = Math.max(data.bestStreak, data.streak);
            data.lastPlayedDate = today;
            saveDailyStreak(data);
            updateStreakUI();

            // Milestone toasts
            if (data.streak === 3)  showToast('🔥 3-day streak! Keep going!', 3000);
            if (data.streak === 7)  showToast('🔥 One week streak! Amazing!', 3000);
            if (data.streak === 30) showToast('🏆 30-day streak! Legendary!', 3000);

            // Cancel today's reminders since they've now played
            cancelTodayReminders();
        }

        function checkStreakIntegrity() {
            // Called on app open — check if streak was broken overnight
            const data    = getDailyStreak();
            const today   = todayKey();
            if (!data.lastPlayedDate || data.lastPlayedDate === today) return;

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yKey = yesterday.toISOString().slice(0, 10);

            if (data.lastPlayedDate !== yKey && data.lastPlayedDate !== today) {
                // Missed at least one day — break streak
                if (data.streak > 0) {
                    data.streak = 0;
                    saveDailyStreak(data);
                    if (data.bestStreak > 1) {
                        showToast(`😔 Streak reset. Best was ${data.bestStreak} days.`, 3500);
                    }
                }
            }
            updateStreakUI();
        }

        function hasPlayedToday() {
            const data = getDailyStreak();
            return data.lastPlayedDate === todayKey();
        }

        function updateStreakUI() {
            const data   = getDailyStreak();
            const el     = document.getElementById('daily-streak-badge');
            const numEl  = document.getElementById('streak-count');
            const flameEl = document.getElementById('streak-flame');
            if (!el) return;

            numEl.textContent  = data.streak;
            const played       = hasPlayedToday();
            el.classList.toggle('streak-played', played);
            el.classList.toggle('streak-unplayed', !played && data.streak > 0);
            flameEl.style.opacity = data.streak > 0 ? '1' : '0.3';

            // Profile page stats
            const ps = document.getElementById('profile-streak');
            if (ps) ps.textContent = data.streak;
            const pds = document.getElementById('profile-daily-streak');
            if (pds) pds.textContent = data.streak + (data.streak > 0 ? ' 🔥' : '');
            const pbs = document.getElementById('profile-best-streak');
            if (pbs) pbs.textContent = data.bestStreak;
        }

        // ============================================
        // PUSH NOTIFICATIONS — daily reminders
        // ============================================
        async function requestNotificationPermission() {
            if (!('Notification' in window)) return false;
            if (Notification.permission === 'granted') return true;
            if (Notification.permission === 'denied') return false;
            const result = await Notification.requestPermission();
            return result === 'granted';
        }

        function scheduleStreakReminders() {
            if (!('Notification' in window)) return;
            if (Notification.permission !== 'granted') return;
            if (hasPlayedToday()) return; // already played, no reminders needed

            cancelTodayReminders(); // clear any old ones first

            const now      = new Date();
            const todayStr = now.toDateString();

            // Three reminder times: 9am, 1pm, 7pm
            const times = [
                { hour: 9,  min: 0,  msg: "🔥 Don't break your streak! Time for your daily Sudoku." },
                { hour: 13, min: 0,  msg: "⏰ Lunchtime Sudoku! Keep your daily streak alive." },
                { hour: 19, min: 0,  msg: "🌙 Last chance! Play a game before midnight to keep your streak." },
            ];

            const timeoutIds = [];

            times.forEach(({ hour, min, msg }) => {
                const target = new Date(now);
                target.setHours(hour, min, 0, 0);
                const delay = target - now;
                if (delay <= 0) return; // already passed today

                const id = setTimeout(async () => {
                    if (hasPlayedToday()) return; // played in the meantime
                    const data = getDailyStreak();
                    const title = data.streak > 0
                        ? `🔥 ${data.streak}-day streak at risk!`
                        : '🎯 Daily Sudoku Challenge';
                    showStreakNotification(title, msg);
                }, delay);

                timeoutIds.push(id);
            });

            // Store IDs so we can cancel them if user plays
            localStorage.setItem('sudoku_reminder_ids', JSON.stringify(timeoutIds));
            console.log(`[Streak] Scheduled ${timeoutIds.length} reminders for today`);
        }

        function cancelTodayReminders() {
            const raw = localStorage.getItem('sudoku_reminder_ids');
            if (!raw) return;
            try {
                const ids = JSON.parse(raw);
                ids.forEach(id => clearTimeout(id));
            } catch(e) { /* ignore */ }
            localStorage.removeItem('sudoku_reminder_ids');
        }

        async function showStreakNotification(title, body) {
            // Try SW notification first (works when app is backgrounded)
            if (swRegistration?.active) {
                swRegistration.active.postMessage({
                    type: 'SHOW_NOTIFICATION',
                    title, body,
                    icon: './icon-192.png',
                    badge: './icon-72.png',
                    tag: 'streak-reminder',
                    data: { url: './' },
                    actions: [
                        { action: 'play', title: '▶ Play Now' },
                        { action: 'dismiss', title: 'Later' },
                    ]
                });
            } else if (Notification.permission === 'granted') {
                // Fallback: direct notification (only works when app is open)
                new Notification(title, {
                    body,
                    icon: './icon-192.png',
                    badge: './icon-72.png',
                    tag: 'streak-reminder',
                });
            }
        }

        async function initStreakNotifications() {
            checkStreakIntegrity();
            updateStreakUI();

            // Ask for notification permission after a short delay (not immediately on load)
            if ('Notification' in window && Notification.permission === 'default') {
                setTimeout(async () => {
                    // Only ask if they've played at least one game
                    const data = getDailyStreak();
                    if (data.streak >= 1 || playerData.profile.gamesPlayed >= 1) {
                        const granted = await requestNotificationPermission();
                        if (granted) {
                            scheduleStreakReminders();
                            showToast('🔔 Streak reminders enabled!', 2000);
                        }
                    }
                }, 5000);
            } else {
                scheduleStreakReminders();
            }
        }

        // ============================================
        // SEEDED RNG (for daily challenge)
        // ============================================
        function mulberry32(seed) {
            return function() {
                seed |= 0; seed = seed + 0x6D2B79F5 | 0;
                let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
                t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };
        }

        function getDailyChallengeSeed() {
            const d = new Date();
            // Seed from year+month+day so it changes daily but is same for everyone
            return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
        }

        function hasDoneChallengeTodayLocal() {
            const key = 'sudoku_daily_challenge_' + new Date().toISOString().slice(0,10);
            return !!localStorage.getItem(key);
        }

        function markChallengeDoneToday(score, elapsed) {
            const key = 'sudoku_daily_challenge_' + new Date().toISOString().slice(0,10);
            localStorage.setItem(key, JSON.stringify({ score, elapsed, ts: Date.now() }));
            // Also save best daily score in soloStats
            const prev = playerData.soloStats['daily'] || {};
            const isNewBest = !prev.bestScore || score > prev.bestScore;
            playerData.soloStats['daily'] = {
                ...prev,
                bestScore: isNewBest ? score : prev.bestScore,
                bestTime: (!prev.bestTime || elapsed < prev.bestTime) ? elapsed : prev.bestTime,
                gamesPlayed: (prev.gamesPlayed || 0) + 1,
            };
            savePlayerData();
        }

        function getTodaysChallengeResult() {
            const key = 'sudoku_daily_challenge_' + new Date().toISOString().slice(0,10);
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        }

        window.launchDailyChallenge = function() {
            const done = hasDoneChallengeTodayLocal();
            if (done) {
                const r = getTodaysChallengeResult();
                const m = Math.floor(r.elapsed/60), s = r.elapsed%60;
                showToast(`✅ Already done today! Score: ${r.score.toLocaleString()} · ${m}m ${s}s`, 3500);
                return;
            }
            gameState.gameMode      = 'solo';
            gameState.difficulty    = 'hard';
            gameState.vsAI          = false;
            gameState.timeLimit     = 9999;
            gameState.isDailyChallenge = true;
            startGame();
        };

        function init() {
            loadPlayerData();
            setupEventListeners();
            setupOnlineListeners();
            tryRestoreSupabase().then(() => {
                initAuth();
                setupAuthListeners();
                setupFriendsListeners();
                initTournamentsPage();
            });
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);

            // Real-time stats started after Supabase connects
            document.getElementById('online-players').textContent = '…';
            document.getElementById('active-games').textContent = '…';

            // Ongoing game icon
            checkAndShowOngoingBanner();
            document.getElementById('ongoing-game-btn').addEventListener('click', resumeGame);

            if (!localStorage.getItem('sudoku_seen_howto')) {
                document.getElementById('how-to-play-modal').classList.add('active');
            }
            document.getElementById('how-to-play-close').addEventListener('click', () => {
                document.getElementById('how-to-play-modal').classList.remove('active');
                localStorage.setItem('sudoku_seen_howto', '1');
            });

            // Daily streak + notifications
            initStreakNotifications();

            // Fix streak bug: if app is left open overnight, re-check on tab focus
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    checkStreakIntegrity();
                    updateStreakUI();
                }
            });


            // Variant badge on game screen
            function updateVariantBadge() {
                const badge = document.getElementById('variant-badge');
                if (!badge) return;
                const labels = {
                    classic:'', diagonal:'✖ Diagonal', windoku:'🪟 Windoku',
                    antiknight:'♞ Anti-Knight', killer:'🔢 Killer', jigsaw:'🧩 Jigsaw',
                    thermo:'🌡 Thermo', consecutive:'↔ Consec.', arrow:'➡ Arrow', evenodd:'⬡ Even/Odd'
                };
                const label = labels[gameState.variant] || '';
                badge.textContent = label;
                badge.style.display = label ? 'inline-block' : 'none';
            }
            document.querySelectorAll('.variant-pill[data-variant]').forEach(c => {
                c.addEventListener('click', updateVariantBadge);
            });

            // Hide splash after app is ready
            setTimeout(hideSplash, 1400);
        }

        init();

    // ============================================================
    // SERVICE WORKER REGISTRATION
    // ============================================================
    let swRegistration = null;
    let deferredInstallPrompt = null;

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                swRegistration = await navigator.serviceWorker.register('./sw.js');
                console.log('[PWA] SW registered ✓ scope:', swRegistration.scope);
                console.log('[PWA] SW state:', swRegistration.active?.state || 'installing');

                // Check for waiting update
                if (swRegistration.waiting) showUpdateToast(swRegistration.waiting);

                swRegistration.addEventListener('updatefound', () => {
                    const newSW = swRegistration.installing;
                    console.log('[PWA] SW update found, state:', newSW.state);
                    newSW.addEventListener('statechange', () => {
                        console.log('[PWA] SW state changed:', newSW.state);
                        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateToast(newSW);
                        }
                    });
                });

                // Page reload after SW takes control
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) { refreshing = true; location.reload(); }
                });

            } catch (e) {
                console.error('[PWA] SW registration FAILED:', e.message, e);
            }
        });
    } else {
        console.warn('[PWA] Service workers not supported in this browser');
    }

    function showUpdateToast(swWaiting) {
        const toast = document.getElementById('sw-update-toast');
        toast.style.display = 'flex';
        document.getElementById('sw-update-btn').onclick = () => {
            swWaiting.postMessage({ type: 'SKIP_WAITING' });
            toast.style.display = 'none';
        };
    }

    // ============================================================
    // INSTALL PROMPT (Android Chrome / Edge)
    // ============================================================
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredInstallPrompt = e;

        // Don't show if dismissed before
        if (!localStorage.getItem('pwa_install_dismissed')) {
            const banner = document.getElementById('pwa-install-banner');
            banner.style.display = 'flex';
        }
    });

    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log('[PWA] Install outcome:', outcome);
        deferredInstallPrompt = null;
        document.getElementById('pwa-install-banner').style.display = 'none';
        if (outcome === 'accepted') {
            // Small celebration
            if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
        }
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
        document.getElementById('pwa-install-banner').style.display = 'none';
        localStorage.setItem('pwa_install_dismissed', '1');
    });

    window.addEventListener('appinstalled', () => {
        console.log('[PWA] App installed!');
        document.getElementById('pwa-install-banner').style.display = 'none';
        deferredInstallPrompt = null;
    });

    // ============================================================
    // HANDLE URL SHORTCUTS (from manifest shortcuts)
    // ============================================================
    window.addEventListener('DOMContentLoaded', () => {
        const params = new URLSearchParams(location.search);
        const shortcut = params.get('shortcut');

        if (shortcut === 'streak') {
            // Open profile page focused on streak after app loads
            setTimeout(() => {
                document.querySelector('[data-page="profile"]')?.click();
                showToast('🔥 Your streak is shown on this page', 2500);
            }, 1000);
        }

        if (shortcut === 'quick') {
            setTimeout(() => {
                document.getElementById('difficulty-modal')?.classList.add('active');
            }, 800);
        }

        if (shortcut === 'ai') {
            setTimeout(() => {
                gameState.timeLimit  = 600;
                gameState.gameMode   = 'simultaneous';
                gameState.vsAI       = true;
                gameState.aiDifficulty = 'medium';
                if (typeof startGame === 'function') startGame();
            }, 800);
        }

        if (shortcut === 'room') {
            setTimeout(() => {
                const btn = document.getElementById('create-room-btn');
                if (btn) btn.click();
            }, 1200);
        }

        if (params.get('quick') === 'ai') {
            setTimeout(() => {
                gameState.timeLimit = 600;
                gameState.gameMode = 'simultaneous';
                gameState.vsAI = true;
                gameState.aiDifficulty = 'medium';
                if (typeof startGame === 'function') startGame();
            }, 800);
        }
        if (params.get('action') === 'create') {
            setTimeout(() => {
                const btn = document.getElementById('create-room-btn');
                if (btn && btn.style.display !== 'none') btn.click();
            }, 1200);
        }
    });

    // ============================================================
    // NETWORK STATUS INDICATOR
    // ============================================================
    function updateOnlineStatus() {
        const isOnline = navigator.onLine;
        const existing = document.getElementById('network-toast');
        if (existing) existing.remove();
        if (!isOnline) {
            const t = document.createElement('div');
            t.id = 'network-toast';
            t.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);background:#c33;color:#fff;padding:6px 14px;border-radius:6px;font-size:0.8rem;font-weight:700;z-index:9002;pointer-events:none;';
            t.textContent = '⚠ Offline — online rooms paused';
            document.body.appendChild(t);
        }
    }
    window.addEventListener('online',  updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    // ============================================================
    // ANDROID NATIVE GESTURE SYSTEM
    // ============================================================
    (function initAndroidGestures() {

        // ── 1. NAVIGATION STACK ──────────────────────────────────
        // Maps each app "screen" to a history state so Android back
        // button (popstate) navigates correctly instead of exiting.
        const PAGES = ['lobby','profile','leaderboard','history','friends','tournaments','settings'];
        const MODAL_IDS = [
            'ai-difficulty-modal','difficulty-modal','result-modal',
            'join-room-modal','how-to-play-modal','auth-modal',
            'create-tournament-modal','tournament-detail-modal',
            'dojo-modal','dojo-intro-modal','dojo-complete-modal',
        ];

        function getTopModal() {
            return MODAL_IDS.map(id => document.getElementById(id))
                .find(el => el && el.classList.contains('active')) || null;
        }

        function isGameActive() {
            const gs = document.getElementById('game-screen');
            return gs && gs.classList.contains('active');
        }

        function isSideMenuOpen() {
            return document.getElementById('side-menu')?.classList.contains('active');
        }

        function getCurrentPage() {
            const active = document.querySelector('.side-menu-item.active');
            return active?.dataset?.page || 'lobby';
        }

        // Push a state so every navigation creates a history entry
        function pushNavState(name) {
            history.pushState({ nav: name }, '', location.href.split('?')[0]);
        }

        // Intercept all page and modal changes to push history entries
        // Patch the page nav click handler once, post-init
        const _origPushState = history.pushState.bind(history);

        // Initial state
        history.replaceState({ nav: 'lobby' }, '');

        // Back gesture / hardware back button
        window.addEventListener('popstate', (e) => {
            // 1. Close any open modal first
            const topModal = getTopModal();
            if (topModal) {
                topModal.classList.remove('active');
                vibrate(30);
                history.pushState({ nav: e.state?.nav || getCurrentPage() }, '');
                return;
            }

            // 2. Close side menu
            if (isSideMenuOpen()) {
                document.getElementById('side-menu').classList.remove('active');
                document.getElementById('side-menu-overlay')?.classList.remove('active');
                vibrate(30);
                history.pushState({ nav: getCurrentPage() }, '');
                return;
            }

            // 3. Close dojo modal (dynamically inserted)
            const dojoModal = document.getElementById('dojo-modal') ||
                              document.getElementById('dojo-intro-modal') ||
                              document.getElementById('dojo-complete-modal');
            if (dojoModal) {
                dojoModal.remove();
                vibrate(30);
                history.pushState({ nav: getCurrentPage() }, '');
                return;
            }

            // 4. Exit game → back to lobby
            if (isGameActive()) {
                document.getElementById('back-to-lobby-btn')?.click();
                vibrate(40);
                history.pushState({ nav: 'lobby' }, '');
                return;
            }

            // 5. Non-lobby page → go back to lobby
            const page = getCurrentPage();
            if (page && page !== 'lobby') {
                document.querySelector('[data-page="lobby"]')?.click();
                vibrate(30);
                return;
            }

            // 6. Already at lobby — minimise app (re-push so we don't exit)
            history.pushState({ nav: 'lobby' }, '');
        });

        // Push a state for every page navigation
        document.querySelectorAll('.side-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                pushNavState(item.dataset.page || 'lobby');
            }, true); // capture phase — fires before the existing click handler
        });

        // Push state when modals open
        MODAL_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const observer = new MutationObserver(mutations => {
                mutations.forEach(m => {
                    if (m.attributeName === 'class') {
                        if (el.classList.contains('active')) {
                            pushNavState('modal:' + id);
                        }
                    }
                });
            });
            observer.observe(el, { attributes: true });
        });

        // ── 2. SWIPE GESTURES ────────────────────────────────────
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let isSwiping = false;

        const SWIPE_THRESHOLD   = 60;   // px minimum horizontal travel
        const SWIPE_VELOCITY    = 0.3;  // px/ms minimum speed
        const EDGE_ZONE         = 28;   // px from screen edge to trigger edge-swipe
        const MAX_VERTICAL_DRIFT = 80;  // px — reject if mostly vertical

        document.addEventListener('touchstart', e => {
            const t = e.touches[0];
            touchStartX    = t.clientX;
            touchStartY    = t.clientY;
            touchStartTime = Date.now();
            isSwiping      = false;
        }, { passive: true });

        document.addEventListener('touchend', e => {
            const t = e.changedTouches[0];
            const dx   = t.clientX - touchStartX;
            const dy   = t.clientY - touchStartY;
            const dt   = Date.now() - touchStartTime;
            const vel  = Math.abs(dx) / dt;
            const isEdge = touchStartX < EDGE_ZONE;

            // Ignore if mostly vertical or too slow (scrolling)
            if (Math.abs(dy) > MAX_VERTICAL_DRIFT) return;
            if (Math.abs(dx) < SWIPE_THRESHOLD && !isEdge) return;
            if (vel < SWIPE_VELOCITY && !isEdge) return;

            const goingRight = dx > 0;
            const goingLeft  = dx < 0;

            // ── Swipe RIGHT (back / close) ─────────────────────
            if (goingRight && (isEdge || Math.abs(dx) >= SWIPE_THRESHOLD)) {
                const topModal = getTopModal();
                if (topModal) {
                    topModal.classList.remove('active');
                    history.back();
                    vibrate(30);
                    return;
                }
                const dojoEl = document.getElementById('dojo-modal') ||
                               document.getElementById('dojo-intro-modal') ||
                               document.getElementById('dojo-complete-modal');
                if (dojoEl) { dojoEl.remove(); history.back(); vibrate(30); return; }

                if (isSideMenuOpen()) {
                    document.getElementById('side-menu').classList.remove('active');
                    document.getElementById('side-menu-overlay')?.classList.remove('active');
                    vibrate(30);
                    return;
                }
                if (isGameActive()) {
                    document.getElementById('back-to-lobby-btn')?.click();
                    vibrate(40);
                    return;
                }
                const page = getCurrentPage();
                if (page !== 'lobby') {
                    document.querySelector('[data-page="lobby"]')?.click();
                    vibrate(30);
                    return;
                }
            }

            // ── Swipe LEFT (open side menu from anywhere on lobby) ─
            if (goingLeft && !isGameActive() && !getTopModal() && !isSideMenuOpen()) {
                const page = getCurrentPage();
                if (page === 'lobby' && Math.abs(dx) >= SWIPE_THRESHOLD) {
                    document.getElementById('side-menu')?.classList.add('active');
                    document.getElementById('side-menu-overlay')?.classList.add('active');
                    pushNavState('menu');
                    vibrate(30);
                    return;
                }
            }

            // ── Swipe DOWN to dismiss modal ──────────────────────
            // (handled separately via Y tracking)
        }, { passive: true });

        // ── Swipe DOWN to dismiss modal ──────────────────────────
        document.addEventListener('touchend', e => {
            const t = e.changedTouches[0];
            const dy = t.clientY - touchStartY;
            const dx = t.clientX - touchStartX;
            const dt = Date.now() - touchStartTime;

            if (Math.abs(dx) > 60) return; // horizontal, skip
            if (dy < 80) return;           // not far enough down

            const topModal = getTopModal();
            if (topModal) {
                topModal.classList.remove('active');
                history.back();
                vibrate(30);
            }
        }, { passive: true });

        // ── 3. PULL-TO-REFRESH ───────────────────────────────────
        // Only on pages where fresh data makes sense
        let pullStartY = 0;
        let pullEl = null;

        document.addEventListener('touchstart', e => {
            const scrollTop = document.documentElement.scrollTop;
            if (scrollTop > 5) return; // only at very top
            pullStartY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', e => {
            const dy = e.changedTouches[0].clientY - pullStartY;
            if (dy < 100) return;
            if (document.documentElement.scrollTop > 5) return;
            if (getTopModal() || isGameActive()) return;

            const page = getCurrentPage();
            vibrate(30);
            showToast('Refreshing…', 1000);

            if (page === 'leaderboard' && typeof loadLeaderboard === 'function') loadLeaderboard();
            if (page === 'friends'     && typeof loadFriends     === 'function') loadFriends();
            if (page === 'tournaments' && typeof loadTournamentsPage === 'function') loadTournamentsPage();
            if (page === 'history'     && typeof loadGameHistory  === 'function') loadGameHistory();
            if (page === 'lobby'       && typeof loadTournaments  === 'function') loadTournaments();
        }, { passive: true });

        // ── 4. LONG-PRESS CONTEXT on game cells ─────────────────
        // (toggles pencil mode while held)
        let longPressTimer = null;
        const canvas = document.getElementById('sudoku-canvas');
        if (canvas) {
            canvas.addEventListener('touchstart', e => {
                longPressTimer = setTimeout(() => {
                    // Toggle pencil/pen mode on long press
                    const penBtn   = document.getElementById('pen-mode-btn');
                    const pencilBtn = document.getElementById('pencil-mode-btn');
                    if (pencilBtn) pencilBtn.click();
                    else if (penBtn) {
                        const inputModeBtn = document.querySelector('.input-mode-btn:not(.active)');
                        if (inputModeBtn) inputModeBtn.click();
                    }
                    vibrate([30, 20, 30]); // distinct long-press haptic
                    showToast(gameState?.inputMode === 'pencil' ? '✏ Pencil mode' : '🖊 Pen mode', 1200);
                }, 500);
            }, { passive: true });
            canvas.addEventListener('touchend',   () => clearTimeout(longPressTimer), { passive: true });
            canvas.addEventListener('touchmove',  () => clearTimeout(longPressTimer), { passive: true });
            canvas.addEventListener('touchcancel',() => clearTimeout(longPressTimer), { passive: true });
        }

        // ── 5. KEYBOARD AWARENESS ────────────────────────────────
        // When the virtual keyboard opens it resizes the viewport,
        // which can push content behind the keyboard. Fix it.
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                const keyboardVisible = window.visualViewport.height < window.innerHeight * 0.75;
                document.body.classList.toggle('keyboard-open', keyboardVisible);
                // If keyboard opened while viewing game, scroll canvas into view
                if (keyboardVisible && isGameActive()) {
                    const c = document.getElementById('sudoku-canvas');
                    if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            });
        }

        // ── 6. PREVENT DOUBLE-TAP ZOOM ──────────────────────────
        // Double-tap zoom breaks the game UI on Android Chrome
        let lastTap = 0;
        document.addEventListener('touchend', e => {
            const now = Date.now();
            const gap = now - lastTap;
            if (gap < 300 && gap > 0) {
                e.preventDefault(); // block double-tap zoom
            }
            lastTap = now;
        }, { passive: false });

        // ── 7. STATUS BAR & DISPLAY INSETS ──────────────────────
        // Read safe area insets from CSS env() for notch/cutout devices
        function applySafeAreaInsets() {
            const style = getComputedStyle(document.documentElement);
            const top    = style.getPropertyValue('--sat') || '0px';
            const bottom = style.getPropertyValue('--sab') || '0px';
            document.documentElement.style.setProperty('--safe-top',    top);
            document.documentElement.style.setProperty('--safe-bottom', bottom);
        }
        applySafeAreaInsets();
        window.addEventListener('resize', applySafeAreaInsets);

        // ── 8. SHAKE TO UNDO / GET HINT ─────────────────────────
        if (window.DeviceMotionEvent) {
            let lastShake = 0;
            let lastAcc = { x: 0, y: 0, z: 0 };
            window.addEventListener('devicemotion', e => {
                const acc = e.accelerationIncludingGravity;
                if (!acc) return;
                const delta = Math.abs(acc.x - lastAcc.x) +
                              Math.abs(acc.y - lastAcc.y) +
                              Math.abs(acc.z - lastAcc.z);
                lastAcc = { x: acc.x, y: acc.y, z: acc.z };
                if (delta > 40 && Date.now() - lastShake > 2000) {
                    lastShake = Date.now();
                    if (isGameActive() && gameState?.isRunning) {
                        vibrate([50, 30, 50]);
                        showToast('📳 Shake detected — use the Hint button for help!', 2500);
                    }
                }
            });
        }

        // ── 9. VISIBILITY CHANGE — pause when app backgrounded ──
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (typeof gameState !== 'undefined' && gameState.isRunning && !gameState.isPaused) {
                    gameState.isPaused = true;
                    gameState._autoPaused = true;
                }
            } else {
                if (typeof gameState !== 'undefined' && gameState._autoPaused) {
                    gameState.isPaused = false;
                    gameState._autoPaused = false;
                    gameState.lastTick = Date.now(); // prevent time jump on resume
                    showToast('▶ Game resumed', 1200);
                    vibrate(30);
                }
            }
        });

    })();


