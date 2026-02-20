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
            // Update rating displays
            document.getElementById('user-rating').textContent = playerRating.toFixed(1);
            document.getElementById('p1-rating-display').textContent = 'Rating: ' + playerRating.toFixed(1);
            document.getElementById('menu-rating').textContent = 'Rating: ' + playerRating.toFixed(1);
            
            // Update username displays
            const username = playerData.settings.username;
            document.getElementById('menu-username').textContent = username;
            document.getElementById('menu-avatar').textContent = username.charAt(0).toUpperCase();
            document.getElementById('profile-username').textContent = username;
            document.getElementById('username-input').value = username;
            
            // Update profile stats
            document.getElementById('profile-rating').textContent = playerRating.toFixed(1);
            document.getElementById('profile-games').textContent = playerData.profile.gamesPlayed;
            document.getElementById('profile-wins').textContent = playerData.profile.wins;
            document.getElementById('profile-losses').textContent = playerData.profile.losses;
            document.getElementById('profile-draws').textContent = playerData.profile.draws;
            document.getElementById('profile-streak').textContent = playerData.profile.bestStreak;
            
            // Update badges
            updateBadges();
            
            // Update settings toggles
            updateToggle('sound-toggle', playerData.settings.soundEnabled);
            updateToggle('animations-toggle', playerData.settings.animationsEnabled);
            
            // Update theme select
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) {
                themeSelect.value = playerData.settings.boardTheme || 'classic';
            }
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
            // First Win
            setBadge('badge-first-win', playerData.profile.wins >= 1);
            // 5 Win Streak
            setBadge('badge-winning-streak', playerData.profile.bestStreak >= 5);
            // Master (4.0+ rating)
            setBadge('badge-master', playerRating >= 4.0);
            // Veteran (100 games)
            setBadge('badge-veteran', playerData.profile.gamesPlayed >= 100);
            // Speedster (bullet win)
            const hasBulletWin = playerData.history.some(g => 
                g.result === 'win' && g.timeControl <= 120
            );
            setBadge('badge-speedster', hasBulletWin);
            // Expert (hard win)
            const hasHardWin = playerData.history.some(g => 
                g.result === 'win' && g.difficulty === 'hard'
            );
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
            const gameRecord = {
                id: Date.now(),
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                difficulty: gameState.difficulty,
                timeControl: gameState.timeLimit,
                result: result, // 'win', 'loss', 'draw'
                p1Score: gameState.scores.p1,
                p2Score: gameState.scores.p2,
                opponent: opponentName || (gameState.vsAI ? 
                    CONFIG.AI_DIFFICULTY[gameState.aiDifficulty].name : 'Opponent'),
                timeRemaining: gameState.p1Time,
                ratingChange: playerRating - playerData.profile.rating
            };
            
            playerData.history.unshift(gameRecord);
            
            // Keep only last 100 games
            if (playerData.history.length > 100) {
                playerData.history = playerData.history.slice(0, 100);
            }
            
            // Update profile stats
            playerData.profile.gamesPlayed++;
            if (result === 'win') {
                playerData.profile.wins++;
                playerData.profile.currentStreak++;
                if (playerData.profile.currentStreak > playerData.profile.bestStreak) {
                    playerData.profile.bestStreak = playerData.profile.currentStreak;
                }
            } else if (result === 'loss') {
                playerData.profile.losses++;
                playerData.profile.currentStreak = 0;
            } else {
                playerData.profile.draws++;
                playerData.profile.currentStreak = 0;
            }
            
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

        function generateLeaderboard() {
            // Generate mock leaderboard data
            const players = [
                { name: 'GrandMaster', rating: 5.2, games: 523, wins: 412 },
                { name: 'SudokuKing', rating: 4.8, games: 892, wins: 634 },
                { name: 'PuzzleQueen', rating: 4.5, games: 445, wins: 312 },
                { name: 'LogicLord', rating: 4.3, games: 678, wins: 453 },
                { name: 'NumberNinja', rating: 4.1, games: 334, wins: 221 },
                { name: 'GridGuru', rating: 3.9, games: 567, wins: 378 },
                { name: 'CellMaster', rating: 3.7, games: 289, wins: 183 },
                { name: 'DigitDuke', rating: 3.5, games: 412, wins: 256 },
                { name: 'RowRuler', rating: 3.3, games: 234, wins: 142 },
                { name: 'BoxBoss', rating: 3.1, games: 198, wins: 115 }
            ];
            
            // Add current player to leaderboard
            const currentPlayer = {
                name: playerData.settings.username,
                rating: playerRating,
                games: playerData.profile.gamesPlayed,
                wins: playerData.profile.wins,
                isCurrentUser: true
            };
            
            // Insert current player and sort
            players.push(currentPlayer);
            players.sort((a, b) => b.rating - a.rating);
            
            return players;
        }

        function renderLeaderboard() {
            const leaderboard = generateLeaderboard();
            const leaderboardList = document.getElementById('leaderboard-list');
            
            leaderboardList.innerHTML = leaderboard.map((player, index) => {
                const rank = index + 1;
                const winRate = player.games > 0 ? 
                    ((player.wins / player.games) * 100).toFixed(0) : 0;
                const rankClass = rank <= 3 ? `rank-${rank}` : '';
                const currentUserClass = player.isCurrentUser ? 'current-user' : '';
                
                return `
                    <div class="leaderboard-item ${rankClass} ${currentUserClass}">
                        <div class="leaderboard-rank">#${rank}</div>
                        <div class="leaderboard-avatar">${player.name.charAt(0).toUpperCase()}</div>
                        <div class="leaderboard-info">
                            <div class="leaderboard-name">${player.name}</div>
                            <div class="leaderboard-stats">${player.games} games • ${winRate}% win rate</div>
                        </div>
                        <div class="leaderboard-rating">${player.rating.toFixed(1)}</div>
                    </div>
                `;
            }).join('');
        }

        // ============================================
        // PUZZLES
        // ============================================
        const PUZZLES = {
            easy: {
                puzzle: [
                    [5, 3, 4, 0, 7, 0, 0, 0, 0],
                    [6, 7, 2, 1, 9, 5, 0, 0, 0],
                    [1, 9, 8, 3, 4, 2, 0, 6, 7],
                    [8, 5, 9, 7, 6, 1, 4, 2, 3],
                    [4, 2, 6, 8, 0, 3, 7, 9, 1],
                    [7, 1, 3, 9, 2, 4, 8, 5, 6],
                    [9, 6, 1, 5, 3, 7, 2, 8, 4],
                    [2, 8, 7, 4, 1, 9, 6, 3, 5],
                    [3, 4, 5, 2, 8, 6, 1, 7, 9]
                ],
                solution: [
                    [5, 3, 4, 6, 7, 8, 9, 1, 2],
                    [6, 7, 2, 1, 9, 5, 3, 4, 8],
                    [1, 9, 8, 3, 4, 2, 5, 6, 7],
                    [8, 5, 9, 7, 6, 1, 4, 2, 3],
                    [4, 2, 6, 8, 5, 3, 7, 9, 1],
                    [7, 1, 3, 9, 2, 4, 8, 5, 6],
                    [9, 6, 1, 5, 3, 7, 2, 8, 4],
                    [2, 8, 7, 4, 1, 9, 6, 3, 5],
                    [3, 4, 5, 2, 8, 6, 1, 7, 9]
                ]
            },
            medium: {
                puzzle: [
                    [5, 3, 0, 0, 7, 0, 0, 0, 0],
                    [6, 0, 0, 1, 9, 5, 0, 0, 0],
                    [0, 9, 8, 0, 0, 0, 0, 6, 0],
                    [8, 0, 0, 0, 6, 0, 0, 0, 3],
                    [4, 0, 0, 8, 0, 3, 0, 0, 1],
                    [7, 0, 0, 0, 2, 0, 0, 0, 6],
                    [0, 6, 0, 0, 0, 0, 2, 8, 0],
                    [0, 0, 0, 4, 1, 9, 0, 0, 5],
                    [0, 0, 0, 0, 8, 0, 0, 7, 9]
                ],
                solution: [
                    [5, 3, 4, 6, 7, 8, 9, 1, 2],
                    [6, 7, 2, 1, 9, 5, 3, 4, 8],
                    [1, 9, 8, 3, 4, 2, 5, 6, 7],
                    [8, 5, 9, 7, 6, 1, 4, 2, 3],
                    [4, 2, 6, 8, 5, 3, 7, 9, 1],
                    [7, 1, 3, 9, 2, 4, 8, 5, 6],
                    [9, 6, 1, 5, 3, 7, 2, 8, 4],
                    [2, 8, 7, 4, 1, 9, 6, 3, 5],
                    [3, 4, 5, 2, 8, 6, 1, 7, 9]
                ]
            },
            hard: {
                puzzle: [
                    [5, 0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 1, 9, 5, 0, 0, 0],
                    [0, 9, 0, 0, 0, 0, 0, 6, 0],
                    [8, 0, 0, 0, 6, 0, 0, 0, 0],
                    [4, 0, 0, 8, 0, 0, 0, 0, 1],
                    [0, 0, 0, 0, 2, 0, 0, 0, 6],
                    [0, 6, 0, 0, 0, 0, 2, 0, 0],
                    [0, 0, 0, 4, 1, 9, 0, 0, 0],
                    [0, 0, 0, 0, 8, 0, 0, 7, 0]
                ],
                solution: [
                    [5, 3, 4, 6, 7, 8, 9, 1, 2],
                    [6, 7, 2, 1, 9, 5, 3, 4, 8],
                    [1, 9, 8, 3, 4, 2, 5, 6, 7],
                    [8, 5, 9, 7, 6, 1, 4, 2, 3],
                    [4, 2, 6, 8, 5, 3, 7, 9, 1],
                    [7, 1, 3, 9, 2, 4, 8, 5, 6],
                    [9, 6, 1, 5, 3, 7, 2, 8, 4],
                    [2, 8, 7, 4, 1, 9, 6, 3, 5],
                    [3, 4, 5, 2, 8, 6, 1, 7, 9]
                ]
            }
        };

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
                        if (supabaseClient && currentUser) loadFriends();
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
                        document.getElementById('difficulty-modal').classList.add('active');
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
            
            gameState.timeRemaining = gameState.timeLimit;
            gameState.p1Time = gameState.timeLimit;
            gameState.p2Time = gameState.timeLimit;
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
                document.getElementById('opponent-rating').textContent = 'Rating: 3.2';
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
                document.getElementById('opponent-rating').textContent = s.onlineRoomId ? 'Online' : 'Rating: 3.2';
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
                if (gameState.gameMode === 'simultaneous') {
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
                
                if (gameState.timeRemaining <= 0) {
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
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };
            
            document.getElementById('p1-timer').textContent = formatTime(gameState.p1Time);
            document.getElementById('p2-timer').textContent = formatTime(gameState.p2Time);
            
            // Low time warning
            [document.getElementById('p1-timer'), document.getElementById('p2-timer')].forEach(el => {
                const time = el.id === 'p1-timer' ? gameState.p1Time : gameState.p2Time;
                el.classList.toggle('low', time < 30);
            });
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
            let isFull = true;
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (gameState.claims[r][c] === 0) {
                        isFull = false;
                        break;
                    }
                }
            }
            
            if (isFull) {
                endGameByCells();
            }
        }

        function endGameByTimeout() {
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
            let result = 'draw';
            
            if (gameState.gameMode !== 'solo') {
                let opponentRating;
                if (gameState.vsAI) {
                    opponentRating = CONFIG.AI_DIFFICULTY[gameState.aiDifficulty].rating;
                } else {
                    opponentRating = 2.0 + Math.random() * 3.0;
                }
                
                if (winner === 1) {
                    result = 'win';
                    const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 2));
                    ratingChange = 0.4 * (1 - expected);
                    ratingChange = Math.max(0.1, Math.min(0.4, ratingChange));
                } else if (winner === 2) {
                    result = 'loss';
                    const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 2));
                    ratingChange = -0.4 * expected;
                    ratingChange = Math.min(-0.1, Math.max(-0.4, ratingChange));
                } else {
                    result = 'draw';
                    ratingChange = 0.05;
                }
                
                playerRating = Math.max(CONFIG.MIN_RATING, 
                    Math.min(CONFIG.MAX_RATING, playerRating + ratingChange));
                saveRating();
                
                // Record game in history
                const opponentName = gameState.vsAI ? 
                    CONFIG.AI_DIFFICULTY[gameState.aiDifficulty].name : 'Online Opponent';
                recordGame(result, opponentName);
            }
            
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
                icon.textContent = gameState.scores.p1 > 0 ? '🎉' : '🤔';
                title.textContent = gameState.scores.p1 > 0 ? 'Puzzle Complete!' : 'Keep Trying!';
                subtitle.textContent = `You solved ${gameState.scores.p1} cells`;
                ratingChangeEl.parentElement.style.display = 'none';
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
                supabaseClient = window.supabase.createClient(url, key);
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
            } catch(e) {
                statusEl.className = 'config-status err';
                statusEl.textContent = '● ' + (e.message || 'Connection failed — check URL & key');
                supabaseClient = null;
            }
        }

        async function tryRestoreSupabase() {
            // Always connect with hardcoded credentials — no user input needed
            document.getElementById('sb-url').value = SUPABASE_URL;
            document.getElementById('sb-key').value = SUPABASE_KEY;
            return connectSupabase();
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
                if (supabaseClient && onlineState.subscription)
                    supabaseClient.removeChannel(onlineState.subscription);
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
            // Save to cloud if signed in
            if (currentUser && supabaseClient && gameState.gameMode !== 'solo') {
                const result = winner === 1 ? 'win' : winner === 2 ? 'loss' : 'draw';
                const oppName = document.getElementById('opponent-name')?.textContent || 'Opponent';
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
                // Sync local player data with cloud profile
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
                updateUIWithProfile();
            }
        }

        function onAuthSuccess() {
            updateAuthUI(true);
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
            if (isSignedIn && currentProfile) {
                authBtn.textContent = currentProfile.username;
                authBtn.classList.add('signed-in');
                signoutBtn.style.display = 'flex';
                // Update avatar
                document.getElementById('menu-avatar').textContent =
                    currentProfile.avatar_emoji || currentProfile.username[0].toUpperCase();
                document.getElementById('menu-username').textContent = currentProfile.username;
                document.getElementById('menu-rating').textContent = 'Rating: ' + currentProfile.rating.toFixed(1);
            } else {
                authBtn.textContent = 'Sign In';
                authBtn.classList.remove('signed-in');
                signoutBtn.style.display = 'none';
            }
        }

        function updateUIWithProfile() {
            if (!currentProfile) return;
            // Profile page
            const pu = document.getElementById('profile-username');
            const pr = document.getElementById('profile-rating');
            const pg = document.getElementById('profile-games');
            const pw = document.getElementById('profile-wins');
            const pl = document.getElementById('profile-losses');
            const pd = document.getElementById('profile-draws');
            const ps = document.getElementById('profile-streak');
            if (pu) pu.textContent = currentProfile.username;
            if (pr) pr.textContent = currentProfile.rating.toFixed(1);
            if (pg) pg.textContent = currentProfile.games_played;
            if (pw) pw.textContent = currentProfile.wins;
            if (pl) pl.textContent = currentProfile.losses;
            if (pd) pd.textContent = currentProfile.draws;
            if (ps) ps.textContent = currentProfile.best_streak;
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
            if (!supabaseClient || !currentUser) return;
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

            // Badge count
            const badge = document.getElementById('friends-badge');
            if (badge) {
                badge.textContent = pending.length;
                badge.style.display = pending.length > 0 ? 'inline' : 'none';
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
        function init() {
            loadPlayerData();
            setupEventListeners();
            setupOnlineListeners();
            tryRestoreSupabase().then(() => {
                initAuth();
                setupAuthListeners();
                setupFriendsListeners();
            });
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);

            document.getElementById('online-players').textContent =
                (10000 + Math.floor(Math.random() * 5000)).toLocaleString();
            document.getElementById('active-games').textContent =
                (2000 + Math.floor(Math.random() * 2000)).toLocaleString();

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
                swRegistration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
                console.log('[PWA] SW registered, scope:', swRegistration.scope);

                // Check for waiting update
                if (swRegistration.waiting) showUpdateToast(swRegistration.waiting);

                swRegistration.addEventListener('updatefound', () => {
                    const newSW = swRegistration.installing;
                    newSW.addEventListener('statechange', () => {
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
                console.warn('[PWA] SW registration failed:', e);
            }
        });
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