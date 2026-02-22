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
            wrongMoves: 0,          // penalty counter
            maxWrongMoves: 3,       // 3 strikes
            errorCell: null,        // { row, col, startTime } for red flash
            highlightNumber: null,  // number to highlight across the board
            floatingScores: [],     // [{x, y, text, startTime, color}] DOM animations
        };

        let playerRating = CONFIG.STARTING_RATING;

        // ============================================
        // PLAYER DATA & STORAGE
        // ============================================
        let playerData = {
            settings: {
                username: 'Player',
                soundEnabled: true,
                animationsEnabled: true,
                boardTheme: 'classic'
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
            history: []
        };

        function loadPlayerData() {
            const saved = localStorage.getItem('sudoku_player_data');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    playerData = { ...playerData, ...parsed };
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
            updateAllDisplays();
        }

        function updateAllDisplays() {
            // Prefer cloud profile when signed in, fall back to local data
            const profile = currentProfile || playerData.profile;
            const username = currentProfile?.username || playerData.settings.username || 'Player';
            const rating = currentProfile?.rating ?? playerRating;
            const gamesPlayed = currentProfile?.games_played ?? playerData.profile.gamesPlayed;
            const wins = currentProfile?.wins ?? playerData.profile.wins;
            const losses = currentProfile?.losses ?? playerData.profile.losses;
            const draws = currentProfile?.draws ?? playerData.profile.draws;
            const bestStreak = currentProfile?.best_streak ?? playerData.profile.bestStreak;
            const avatar = currentProfile?.avatar_emoji || username.charAt(0).toUpperCase();

            // Update rating displays
            const ratingStr = rating.toFixed(1);
            document.getElementById('user-rating').textContent = ratingStr;
            document.getElementById('p1-rating-display').textContent = 'Rating: ' + ratingStr;
            document.getElementById('menu-rating').textContent = 'Rating: ' + ratingStr;

            // Update username displays
            document.getElementById('menu-username').textContent = username;
            document.getElementById('menu-avatar').textContent = avatar;
            document.getElementById('profile-username').textContent = username;
            const usernameInput = document.getElementById('username-input');
            if (usernameInput && document.activeElement !== usernameInput) {
                usernameInput.value = username;
            }

            // Update profile stats
            document.getElementById('profile-rating').textContent = ratingStr;
            document.getElementById('profile-games').textContent = gamesPlayed;
            document.getElementById('profile-wins').textContent = wins;
            document.getElementById('profile-losses').textContent = losses;
            document.getElementById('profile-draws').textContent = draws;
            document.getElementById('profile-streak').textContent = bestStreak;

            // Update badges
            updateBadges();

            // Update settings toggles
            updateToggle('sound-toggle', playerData.settings.soundEnabled);
            updateToggle('animations-toggle', playerData.settings.animationsEnabled);

            // Update theme select
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) themeSelect.value = playerData.settings.boardTheme || 'classic';
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
                const timeControlText = `${Math.floor(game.timeControl / 60)}+0`;
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
        function generateSudoku(difficulty, timeLimit) {

            // Start with a complete valid solution
            const solution = generateCompleteSolution();
            
            // Scale difficulty based on time control
            // Shorter time = easier puzzles, longer time = harder puzzles
            let difficultyMultiplier = 1.0;
            
            if (timeLimit <= 120) {
                // Bullet (2 min): Make it easier
                difficultyMultiplier = 0.6;
            } else if (timeLimit <= 300) {
                // Blitz (5 min): Slightly easier
                difficultyMultiplier = 0.8;
            } else if (timeLimit <= 600) {
                // Rapid (10 min): Normal
                difficultyMultiplier = 1.0;
            } else if (timeLimit <= 900) {
                // Rapid (15 min): Slightly harder
                difficultyMultiplier = 1.15;
            } else {
                // Classical (20+ min): Much harder
                difficultyMultiplier = 1.3;
            }
            
            // Create puzzle by removing numbers based on difficulty
            const baseCellsToRemove = {
                easy: 30,    // Base removal for easy
                medium: 40,  // Base removal for medium
                hard: 50     // Base removal for hard
            };
            
            const puzzle = solution.map(row => [...row]);
            const baseRemoval = baseCellsToRemove[difficulty] || baseCellsToRemove.medium;
            const numToRemove = Math.min(60, Math.floor(baseRemoval * difficultyMultiplier));
            
            // Randomly remove cells
            let removed = 0;
            const cells = [];
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    cells.push({r, c});
                }
            }
            
            // Shuffle cells
            for (let i = cells.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cells[i], cells[j]] = [cells[j], cells[i]];
            }
            
            // Remove numbers
            for (let i = 0; i < numToRemove && i < cells.length; i++) {
                const {r, c} = cells[i];
                puzzle[r][c] = 0;
                removed++;
            }
            
            return { puzzle, solution };
        }

        function generateCompleteSolution() {
            // Create empty grid
            const grid = Array(9).fill(null).map(() => Array(9).fill(0));
            
            // Fill diagonal 3x3 boxes first (they don't affect each other)
            for (let box = 0; box < 9; box += 3) {
                fillBox(grid, box, box);
            }
            
            // Fill remaining cells
            solveSudoku(grid);
            
            return grid;
        }

        function fillBox(grid, row, col) {
            const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            // Shuffle numbers
            for (let i = nums.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [nums[i], nums[j]] = [nums[j], nums[i]];
            }
            
            let idx = 0;
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    grid[row + r][col + c] = nums[idx++];
                }
            }
        }

        function solveSudoku(grid) {
            const empty = findEmptyCell(grid);
            if (!empty) return true; // Solved
            
            const [row, col] = empty;
            const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            
            // Shuffle for randomness
            for (let i = nums.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [nums[i], nums[j]] = [nums[j], nums[i]];
            }
            
            for (const num of nums) {
                if (isValidPlacement(grid, row, col, num)) {
                    grid[row][col] = num;
                    
                    if (solveSudoku(grid)) {
                        return true;
                    }
                    
                    grid[row][col] = 0;
                }
            }
            
            return false;
        }

        function findEmptyCell(grid) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (grid[r][c] === 0) {
                        return [r, c];
                    }
                }
            }
            return null;
        }

        function isValidPlacement(grid, row, col, num) {
            // Check row
            for (let c = 0; c < 9; c++) {
                if (grid[row][c] === num) return false;
            }
            
            // Check column
            for (let r = 0; r < 9; r++) {
                if (grid[r][col] === num) return false;
            }
            
            // Check 3x3 box
            const boxRow = Math.floor(row / 3) * 3;
            const boxCol = Math.floor(col / 3) * 3;
            for (let r = boxRow; r < boxRow + 3; r++) {
                for (let c = boxCol; c < boxCol + 3; c++) {
                    if (grid[r][c] === num) return false;
                }
            }
            
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
                    drawGrid();
                }
            });
            
            // Sound toggle
            document.getElementById('sound-toggle').addEventListener('click', function() {
                this.classList.toggle('active');
                playerData.settings.soundEnabled = this.classList.contains('active');
                savePlayerData();
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
            for (let num = 1; num <= 9; num++) {
                let count = 0;
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        if (gameState.puzzle[r][c] === num) {
                            count++;
                        }
                    }
                }
                const remaining = 9 - count;
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

        function handleNumberInput(num) {
            // In pass & play mode during opponent's turn, only allow pencil mode
            if (gameState.gameMode === 'passplay' && gameState.currentPlayer !== 1 && gameState.inputMode !== 'pencil') {
                return; // Don't allow pen mode during opponent's turn, but pencil is OK
            }

            if (!gameState.selectedCell) {
                // If no cell selected, select first empty cell
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        if (gameState.claims[r][c] === 0) {
                            gameState.selectedCell = { row: r, col: c };
                            drawGrid();
                            break;
                        }
                    }
                    if (gameState.selectedCell) break;
                }
            }

            if (!gameState.selectedCell) return;

            const { row, col } = gameState.selectedCell;

            if (gameState.inputMode === 'pencil') {
                // Pencil mode: toggle pencil mark (with safety checks)
                if (!gameState.pencilMarks || !gameState.pencilMarks[row] || !gameState.pencilMarks[row][col]) {
                    // Initialize if needed
                    if (!gameState.pencilMarks) {
                        gameState.pencilMarks = Array(9).fill(null).map(() => 
                            Array(9).fill(null).map(() => new Set())
                        );
                    }
                }
                
                if (!gameState.pencilMarks[row][col].has(num)) {
                    gameState.pencilMarks[row][col].add(num);
                } else {
                    gameState.pencilMarks[row][col].delete(num);
                }
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
                gameState.scores.p1--;
                updateScores();
            }
            // Clear pencil marks (with safety check)
            if (gameState.pencilMarks && gameState.pencilMarks[row] && gameState.pencilMarks[row][col]) {
                gameState.pencilMarks[row][col].clear();
            }
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

            // Time cards
            document.querySelectorAll('.time-card').forEach(card => {
                card.addEventListener('click', () => {
                    document.querySelectorAll('.time-card').forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    gameState.timeLimit = parseInt(card.dataset.time) || 600;
                });
            });

            // Mode cards
            document.querySelectorAll('.mode-card[data-mode]').forEach(card => {
                card.addEventListener('click', () => {
                    document.querySelectorAll('.mode-card[data-mode]').forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    gameState.gameMode = card.dataset.mode;
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
            document.getElementById('quick-match-btn').addEventListener('click', () => {
                gameState.timeLimit = 600;
                gameState.gameMode = 'simultaneous';
                gameState.vsAI = false;
                startGame();
            });

            // Difficulty selection (for puzzles)
            document.querySelectorAll('.difficulty-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    gameState.difficulty = btn.dataset.diff;
                    gameState.vsAI = false;
                    gameState.gameMode = 'solo';
                    document.getElementById('difficulty-modal').classList.remove('active');
                    startGame();
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
                drawGrid();
            }
        }

        // ============================================
        // GAME LIFECYCLE
        // ============================================
        function startGame() {
            // Generate a fresh puzzle each time, scaled to time control
            const puzzleData = generateSudoku(gameState.difficulty, gameState.timeLimit);
            gameState.puzzle = puzzleData.puzzle.map(row => [...row]);
            gameState.solution = puzzleData.solution.map(row => [...row]);
            
            gameState.claims = Array(9).fill(null).map(() => Array(9).fill(0));
            gameState.pencilMarks = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));
            
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
            gameState.currentPlayer = 1;
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
            updateWrongMovesDisplay();
            
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
            const p2Row = document.querySelector('.player-row.p2-row') || document.querySelector('[class*="p2"]')?.closest('.player-row');
            const opponentPanel = document.getElementById('p2-panel') || document.querySelector('.opponent-panel');
            if (gameState.gameMode === 'solo') {
                // Hide opponent display elements
                document.querySelector('.player-row:first-child')?.style && 
                    (document.querySelectorAll('.player-row')[0].style.display = 'none');
                document.getElementById('turn-indicator') && 
                    (document.getElementById('turn-indicator').style.display = 'none');
            } else {
                document.querySelectorAll('.player-row').forEach(r => r.style.display = '');
                const ti = document.getElementById('turn-indicator');
                if (ti) ti.style.display = '';
            }
            
            lobby.style.display = 'none';
            gameScreen.classList.add('active');
            
            resizeCanvas();
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

            // Board background colors (classic theme)
            const lightCell = '#f0d9b5';
            const darkCell  = '#b58863';
            const p1Color   = 'rgba(74,158,255,0.85)';
            const p2Color   = 'rgba(255,140,74,0.85)';
            const preColor  = '#a89f91';

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
        function gameLoop() {
            if (!gameState.isRunning) return;
            
            const now = Date.now();
            const delta = (now - gameState.lastTick) / 1000;
            gameState.lastTick = now;
            
            if (!gameState.isPaused) {
                if (gameState.gameMode === 'solo') {
                    // Solo/puzzle mode — untimed, just track elapsed for display
                    gameState.dojoElapsed = (gameState.dojoElapsed || 0) + delta;
                    // No timeout for solo mode
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
            drawGrid();
            
            requestAnimationFrame(gameLoop);
        }

        function updateTimerDisplay() {
            const formatTime = (seconds) => {
                const mins = Math.floor(Math.abs(seconds) / 60);
                const secs = Math.floor(Math.abs(seconds) % 60);
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };

            if (gameState.gameMode === 'solo') {
                // Show elapsed time counting up
                const elapsed = gameState.dojoElapsed || 0;
                document.getElementById('p1-timer').textContent = formatTime(elapsed);
                document.getElementById('p2-timer').textContent = '';
            } else {
                document.getElementById('p1-timer').textContent = formatTime(gameState.p1Time);
                document.getElementById('p2-timer').textContent = formatTime(gameState.p2Time);
                
                // Low time warning
                [document.getElementById('p1-timer'), document.getElementById('p2-timer')].forEach(el => {
                    const time = el.id === 'p1-timer' ? gameState.p1Time : gameState.p2Time;
                    el.classList.toggle('low', time < 30);
                });
            }
        }

        function updateScores() {
            document.getElementById('p1-score').textContent = gameState.scores.p1;
            document.getElementById('p2-score').textContent = gameState.scores.p2;
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
            const size = canvas.width / window.devicePixelRatio;
            const cellSize = size / 9;
            const now = Date.now();
            
            // Get current theme
            const currentTheme = CONFIG.THEMES[playerData.settings.boardTheme] || CONFIG.THEMES.classic;
            
            // Clear
            ctx.fillStyle = currentTheme.dark;
            ctx.fillRect(0, 0, size, size);
            
            // Draw cells
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
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
                            (Math.floor(row/3) === Math.floor(sr/3) && Math.floor(col/3) === Math.floor(sc/3)));
                    }
                    // Highlight cells with same number as highlightNumber
                    if (gameState.highlightNumber && gameState.puzzle[row][col] === gameState.highlightNumber) {
                        isSameNumber = true;
                    }

                    // Error flash check
                    const isErrorCell = gameState.errorCell &&
                                       gameState.errorCell.row === row &&
                                       gameState.errorCell.col === col;
                    
                    // Checkerboard pattern
                    const isLight = (Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 0;
                    let bgColor = isLight ? currentTheme.light : currentTheme.dark;
                    
                    // Apply claim tint
                    if (claim === -1) {
                        bgColor = currentTheme.prefilled;
                    } else if (claim === 1) {
                        bgColor = isLight ? 
                            'rgba(74, 158, 255, 0.4)' : 'rgba(74, 158, 255, 0.5)';
                    } else if (claim === 2) {
                        bgColor = isLight ? 
                            'rgba(255, 140, 74, 0.4)' : 'rgba(255, 140, 74, 0.5)';
                    }
                    
                    // Animation
                    const cellKey = `${row},${col}`;
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

                    // Row/col/box highlight zone (subtle tint)
                    if (isHighlightZone && !isSelected && claim === 0) {
                        ctx.fillStyle = 'rgba(255,255,255,0.10)';
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
                        ctx.fillStyle = CONFIG.COLOR_SELECTED;
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
                        ctx.font = `bold ${cellSize * 0.65}px -apple-system, sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        if (claim === -1) {
                            ctx.fillStyle = '#1a1a1a';
                        } else if (claim === 1) {
                            ctx.fillStyle = '#003d80';
                        } else if (claim === 2) {
                            ctx.fillStyle = '#8b4513';
                        } else {
                            ctx.fillStyle = '#1a1a1a';
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
                        ctx.font = `${cellSize * 0.25}px -apple-system, sans-serif`;
                        ctx.fillStyle = '#777';
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
            
            // Grid lines - calculate color based on theme
            const gridLineColor = currentTheme.dark === '#1a1a1a' ? '#444' : // Neon theme
                                 currentTheme.dark === '#4682b4' ? '#2c5282' : // Ocean theme
                                 currentTheme.dark === '#ff8533' ? '#cc6600' : // Sunset theme
                                 '#5d4037'; // Default brown
            ctx.strokeStyle = gridLineColor;
            ctx.lineWidth = 1;
            
            for (let i = 0; i <= 9; i++) {
                const pos = i * cellSize;
                ctx.beginPath();
                ctx.moveTo(pos, 0);
                ctx.lineTo(pos, size);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, pos);
                ctx.lineTo(size, pos);
                ctx.stroke();
            }
            
            // Bold box lines
            const boldLineColor = currentTheme.dark === '#1a1a1a' ? '#666' : // Neon theme
                                 currentTheme.dark === '#4682b4' ? '#1e3a5f' : // Ocean theme
                                 currentTheme.dark === '#ff8533' ? '#994d00' : // Sunset theme
                                 '#3e2723'; // Default dark brown
            ctx.strokeStyle = boldLineColor;
            ctx.lineWidth = 2;
            
            for (let i = 0; i <= 3; i++) {
                const pos = i * 3 * cellSize;
                ctx.beginPath();
                ctx.moveTo(pos, 0);
                ctx.lineTo(pos, size);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, pos);
                ctx.lineTo(size, pos);
                ctx.stroke();
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
            const cellSize = size / 9;
            
            const col = Math.floor(x / cellSize);
            const row = Math.floor(y / cellSize);
            
            if (row < 0 || row >= 9 || col < 0 || col >= 9) return;
            if (gameState.claims[row][col] !== 0) return;
            
            gameState.selectedCell = { row, col };
            // Highlight the number in this cell (if filled)
            gameState.highlightNumber = gameState.puzzle[row][col] || null;
            drawGrid();
            // No longer showing the popup picker - permanent pad is always visible
        }

        function showNumberPicker() {
            // Deprecated - keeping for compatibility
        }

        function hideNumberPicker() {
            // Deprecated - keeping for compatibility
            gameState.selectedCell = null;
            drawGrid();
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
                gameState.errorCell = { row, col, startTime: Date.now() };

                // Penalty: lose 10 seconds of time
                const PENALTY_SECONDS = 10;
                if (gameState.gameMode === 'simultaneous' || gameState.gameMode === 'solo') {
                    gameState.timeRemaining = Math.max(0, gameState.timeRemaining - PENALTY_SECONDS);
                    gameState.p1Time = gameState.timeRemaining;
                    gameState.p2Time = gameState.timeRemaining;
                } else if (gameState.gameMode === 'passplay') {
                    gameState.p1Time = Math.max(0, gameState.p1Time - PENALTY_SECONDS);
                }

                // Show penalty toast
                showPenaltyToast(PENALTY_SECONDS);

                // Play error sound
                playSound('error');

                // If 3 wrong moves → lose 1 point (if any) and show warning
                if (gameState.wrongMoves >= gameState.maxWrongMoves) {
                    if (gameState.scores.p1 > 0) {
                        gameState.scores.p1--;
                        updateScores();
                        spawnFloatingScore(row, col, '-1', '#f05a5a');
                    }
                    gameState.wrongMoves = 0; // reset counter after penalty
                }

                updateWrongMovesDisplay();
                drawGrid();
                // Auto-clear error flash after 600ms
                setTimeout(() => {
                    gameState.errorCell = null;
                    drawGrid();
                }, 600);
                return;
            }
            
            const player = gameState.gameMode === 'passplay' ? gameState.currentPlayer : 1;
            
            // Clear pencil marks from this cell
            if (gameState.pencilMarks && gameState.pencilMarks[row] && gameState.pencilMarks[row][col]) {
                gameState.pencilMarks[row][col].clear();
            }

            // Highlight the placed number
            gameState.highlightNumber = number;
            
            claimCell(row, col, number, player);
            updateRemainingCounts();

            // Spawn +1 float
            spawnFloatingScore(row, col, '+1', player === 1 ? '#4a9eff' : '#ff8c4a');
            
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
            toast.textContent = `⚠ Wrong move! −${seconds}s`;
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
            el.style.color = gameState.wrongMoves >= 2 ? '#f05a5a' : gameState.wrongMoves === 1 ? '#f5a623' : '#5a5a7a';
        }

        function spawnFloatingScore(row, col, text, color) {
            const size = canvas.width / window.devicePixelRatio;
            const cellSize = size / 9;
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
                let { row, col } = gameState.selectedCell || { row: 4, col: 4 };
                if (e.key === 'ArrowUp')    row = Math.max(0, row - 1);
                if (e.key === 'ArrowDown')  row = Math.min(8, row + 1);
                if (e.key === 'ArrowLeft')  col = Math.max(0, col - 1);
                if (e.key === 'ArrowRight') col = Math.min(8, col + 1);
                // Skip pre-filled cells
                if (gameState.claims[row][col] !== -1) {
                    gameState.selectedCell = { row, col };
                } else {
                    gameState.selectedCell = { row, col };
                }
                drawGrid();
                return;
            }

            // Escape to deselect
            if (e.key === 'Escape') {
                gameState.selectedCell = null;
                gameState.highlightNumber = null;
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
            
            gameState.animatingCells.set(`${row},${col}`, {
                startTime: Date.now(),
                player: player
            });
            
            playSound('claim');
            updateScores();
            drawGrid();
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
            // Solo/puzzle mode: board full = puzzle complete
            if (gameState.gameMode === 'solo') {
                let isFull = true;
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        if (gameState.claims[r][c] === 0) { isFull = false; break; }
                    }
                    if (!isFull) break;
                }
                if (isFull) endGame(1, 'solved');
                return;
            }
            // Competitive: board full = count cells
            let isFull = true;
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (gameState.claims[r][c] === 0) { isFull = false; break; }
                }
                if (!isFull) break;
            }
            if (isFull) endGameByCells();
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
                const opponentRating = 2.0 + Math.random() * 3.0;
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
            const modal = document.getElementById('result-modal');
            const icon = document.getElementById('result-icon');
            const title = document.getElementById('result-title');
            const subtitle = document.getElementById('result-subtitle');
            
            document.getElementById('p1-final-score').textContent = gameState.scores.p1;
            document.getElementById('p2-final-score').textContent = gameState.scores.p2;
            document.getElementById('old-rating').textContent = oldRating.toFixed(1);
            document.getElementById('new-rating').textContent = playerRating.toFixed(1);
            
            const deltaEl = document.getElementById('rating-delta');
            const ratingChangeEl = document.getElementById('rating-change');
            
            if (ratingChange > 0) {
                deltaEl.textContent = `(+${ratingChange.toFixed(1)})`;
                ratingChangeEl.className = 'rating-change positive';
            } else if (ratingChange < 0) {
                deltaEl.textContent = `(${ratingChange.toFixed(1)})`;
                ratingChangeEl.className = 'rating-change negative';
            } else {
                deltaEl.textContent = '(+0.0)';
                ratingChangeEl.className = 'rating-change';
            }
            
            if (gameState.gameMode === 'solo') {
                const solved = reason === 'solved'; // full board completed
                const elapsed = Math.round(gameState.dojoElapsed || 0);
                const mins = Math.floor(elapsed / 60), secs = elapsed % 60;
                const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                icon.textContent = solved ? '🎉' : '🤔';
                title.textContent = solved ? 'Puzzle Complete!' : 'Keep Trying!';
                subtitle.textContent = solved
                    ? `Solved in ${timeStr} · ${gameState.scores.p1} cells`
                    : `You placed ${gameState.scores.p1} cells so far`;
                ratingChangeEl.parentElement.style.display = 'none';
                // Award dojo XP on full solve
                if (gameState.dojoTechniqueId && solved) {
                    completeDojoPuzzle();
                }
            } else if (winner === 1) {
                icon.textContent = '🏆';
                title.textContent = 'You Win!';
                subtitle.textContent = reason === 'resign' ? 'Opponent resigned' :
                                      reason === 'timeout' ? 'Opponent ran out of time' :
                                      reason === 'time' ? 'More time remaining' :
                                      'Most cells claimed';
                ratingChangeEl.parentElement.style.display = 'block';
            } else if (winner === 2) {
                icon.textContent = '😔';
                title.textContent = 'You Lose';
                subtitle.textContent = reason === 'resign' ? 'You resigned' :
                                      reason === 'timeout' ? 'You ran out of time' :
                                      reason === 'time' ? 'Opponent had more time' :
                                      'Opponent claimed more cells';
                ratingChangeEl.parentElement.style.display = 'block';
            } else {
                icon.textContent = '🤝';
                title.textContent = 'Draw!';
                subtitle.textContent = 'Equal cells claimed';
                ratingChangeEl.parentElement.style.display = 'block';
            }
            
            modal.classList.add('active');
        }

        // ============================================
        // AI OPPONENT
        // ============================================
        let aiTimeout = null;

        function scheduleAIMove() {
            if (!gameState.isRunning || !gameState.vsAI) return;
            
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
            for (let c = 0; c < 9; c++) {
                if (gameState.puzzle[row][c] === num && c !== col) return false;
            }
            for (let r = 0; r < 9; r++) {
                if (gameState.puzzle[r][col] === num && r !== row) return false;
            }
            const boxRow = Math.floor(row / 3) * 3;
            const boxCol = Math.floor(col / 3) * 3;
            for (let r = boxRow; r < boxRow + 3; r++) {
                for (let c = boxCol; c < boxCol + 3; c++) {
                    if (gameState.puzzle[r][c] === num && (r !== row || c !== col)) return false;
                }
            }
            return true;
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

        function startRealtimeStats() {
            if (!supabaseClient) return;

            // 1. Presence channel — each tab joins, we count members
            if (_presenceChannel) supabaseClient.removeChannel(_presenceChannel);
            _presenceChannel = supabaseClient.channel('lobby-presence', {
                config: { presence: { key: 'player' } }
            });

            _presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = _presenceChannel.presenceState();
                    const count = Object.keys(state).length;
                    document.getElementById('online-players').textContent = count.toLocaleString();
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await _presenceChannel.track({
                            user_id: currentUser?.id || 'guest-' + Math.random().toString(36).slice(2),
                            online_at: new Date().toISOString()
                        });
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

            supabaseClient.channel('lobby-tournaments-live')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, loadTournaments)
                .subscribe();
        }

        // ============================================================
        // TOURNAMENTS PAGE — full system
        // ============================================================
        const ICONS = { fire: '🔥', bolt: '⚡', trophy: '🏆', star: '⭐', crown: '👑' };
        let _currentTournamentId = null;
        let _tournamentDetailInterval = null;

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

            supabaseClient.channel('tournaments-page-live')
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
            document.getElementById('opponent-name').textContent = oppName;
            document.getElementById('opponent-rating').textContent = 'Online';
            document.getElementById('ai-indicator').classList.remove('active');
            document.getElementById('online-badge').classList.add('active');

            lobby.style.display = 'none';
            gameScreen.classList.add('active');
            resizeCanvas();
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
            const ratingBefore = currentProfile?.rating || playerData.rating;
            const ratingAfter = playerData.rating;
            try {
                await supabaseClient.from('game_history').insert({
                    player_id: currentUser.id,
                    opponent_name: oppName,
                    result,
                    my_score: myScore,
                    opp_score: oppScore,
                    game_mode: gameState.gameMode,
                    time_control: gameState.timeLimit,
                    rating_before: ratingBefore,
                    rating_after: ratingAfter,
                });
                // Update profile stats
                await supabaseClient.from('profiles').update({
                    rating: ratingAfter,
                    games_played: (currentProfile?.games_played || 0) + 1,
                    wins:   (currentProfile?.wins   || 0) + (result === 'win'  ? 1 : 0),
                    losses: (currentProfile?.losses || 0) + (result === 'loss' ? 1 : 0),
                    draws:  (currentProfile?.draws  || 0) + (result === 'draw' ? 1 : 0),
                    best_streak: Math.max(currentProfile?.best_streak || 0, playerData.stats?.currentStreak || 0),
                    updated_at: new Date().toISOString(),
                }).eq('id', currentUser.id);
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
        async function loadLeaderboard() {
            if (!supabaseClient) return;
            const { data } = await supabaseClient
                .from('profiles')
                .select('username, rating, wins, games_played, avatar_emoji')
                .order('rating', { ascending: false })
                .limit(50);
            if (!data) return;
            const list = document.getElementById('leaderboard-list');
            if (!list) return;
            list.innerHTML = '';
            data.forEach((p, i) => {
                const isMe = currentProfile && p.username === currentProfile.username;
                const el = document.createElement('div');
                el.className = 'leaderboard-item' + (isMe ? ' leaderboard-me' : '');
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;
                el.innerHTML = `
                    <div class="lb-rank">${medal}</div>
                    <div class="lb-avatar">${p.avatar_emoji || p.username[0].toUpperCase()}</div>
                    <div class="lb-info">
                        <div class="lb-name">${p.username}${isMe ? ' (you)' : ''}</div>
                        <div class="lb-games">${p.wins}W · ${p.games_played} games</div>
                    </div>
                    <div class="lb-rating">${p.rating.toFixed(1)}</div>`;
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
                    requester:profiles!friendships_requester_id_fkey(id, username, rating, avatar_emoji),
                    addressee:profiles!friendships_addressee_id_fkey(id, username, rating, avatar_emoji)
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
            // Top-right header notification badge — real pending friend requests
            const notifBadge = document.getElementById('notif-badge');
            if (notifBadge) {
                notifBadge.textContent = pending.length;
                notifBadge.style.display = pending.length > 0 ? 'inline' : 'none';
            }

            renderFriendsList(accepted);
            renderPendingList(pending);
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

        function makeFriendCard(profile, actions) {
            const el = document.createElement('div');
            el.className = 'friend-card';
            el.innerHTML = `
                <div class="friend-avatar">${profile.avatar_emoji || profile.username[0].toUpperCase()}</div>
                <div class="friend-info">
                    <div class="friend-name">${profile.username}</div>
                    <div class="friend-rating">Rating: ${profile.rating?.toFixed(1) || '2.0'}</div>
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
        if (params.get('quick') === 'ai') {
            // Auto-start quick AI game after a short delay
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