
(function () {
    'use strict';

    // --- ДОСТУП К ЛОКАЛЬНОМУ ХРАНИЛИЩУ (БЕЗОПАСНЫЙ ИНИЦИАЛИЗАТОР) ---
    let initialCoins = 100;
    try {
        const savedCoins = localStorage.getItem('nexus_coins');
        if (savedCoins && !isNaN(parseInt(savedCoins))) initialCoins = parseInt(savedCoins);
    } catch (e) {}

    let initialSkins = ['#00EF72'];
    try {
        const savedSkins = localStorage.getItem('nexus_skins');
        if (savedSkins) {
            const parsed = JSON.parse(savedSkins);
            if (Array.isArray(parsed)) initialSkins = parsed;
        }
    } catch (e) {}

    // ГЛОБАЛЬНОЕ СОСТОЯНИЕ СИСТЕМЫ (STATE)
    const STATE = {
        user: localStorage.getItem('nexus_user') || null,
        coins: initialCoins,
        skins: initialSkins,
        activeSkin: localStorage.getItem('nexus_active_skin') || '#00EF72',
        currentGameEngine: null,
        selectedGame: null,
        selectedMode: null
    };

    // РЕЖИМЫ ИГР И ИХ НАСТРОЙКИ
    const GAME_MODES = {
        snake: [
            { id: 'classic', name: 'Классика (Сквозь стены)', desc: 'Свободное перемещение сквозь края экрана.' },
            { id: 'hardcore', name: 'Хардкор (Летальные стены)', desc: 'Врезание в границу поля означает мгновенную смерть.' }
        ],
        reactor: [
            { id: 'zen', name: 'Дзен Режим', desc: 'Спокойный кликер. Только очки, без опасных элементов.' },
            { id: 'chaos', name: 'Хаос Режим', desc: 'Высокая скорость! Появляются взрывоопасные бомбы и золото.' }
        ],
        blockblast: [
            { id: 'arcade', name: 'Аркадный Бласт', desc: 'Кликай по случайно появляющимся блокам, пока поле не переполнилось.' }
        ],
        cyberdash: [
            { id: 'neon', name: 'Бесконечный Неон', desc: 'Управляй гравитацией кликом по экрану. Уклоняйся от барьеров.' }
        ]
    };

    // КАТАЛОГ МАГАЗИНА С КИБЕРПАНК СКИНАМИ
    const SHOP_CATALOG = [
        { id: '#00EF72', name: 'Acid Neon', price: 0 },
        { id: '#0A84FF', name: 'Deep Space', price: 100 },
        { id: '#BF5AF2', name: 'Cyberpunk', price: 250 },
        { id: '#FF9F0A', name: 'Supernova', price: 500 },
        { id: '#FF375F', name: 'Bloody Mary', price: 800 }
    ];

    // --- СИСТЕМА АНИМАЦИИ ЧАСТИЦ (iOS STYLE: FAST-SLOW-FAST DECAY) ---
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            // Высокая начальная скорость взрыва
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 4;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.radius = Math.random() * 3 + 2;
            this.alpha = 1;
            this.decay = Math.random() * 0.02 + 0.015;
        }
        update() {
            // Физическое трение для эффекта плавного торможения интерфейса iPhone
            this.vx *= 0.92;
            this.vy *= 0.92;
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= this.decay;
        }
        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ============================================================================
    // ИГРОВЫЕ ДВИЖКИ (GAME ENGINES)
    // ============================================================================

    // --- 1. ДВИЖОК: SNAKE (ЗМЕЙКА) ---
    class SeniorSnake {
        constructor(canvas, mode) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.mode = mode;
            this.gridSize = 20;
            this.tile = canvas.width / this.gridSize;
            this.snake = [{ x: 10, y: 10 }];
            this.dir = { x: 1, y: 0 };
            this.nextDir = { x: 1, y: 0 };
            this.apple = { x: 5, y: 5 };
            this.particles = [];
            this.score = 0;
            this.speed = 130;
            this.lastTick = 0;
            this.alive = true;
            this.skinColor = STATE.activeSkin;
            this.spawnApple();
            this.bindEvents();
            this.loop(0);
        }
        bindEvents() {
            this.onKeyDown = (e) => {
                const k = e.key.toLowerCase();
                if ((k === 'arrowup' || k === 'w' || k === 'ц') && this.dir.y === 0) this.nextDir = { x: 0, y: -1 };
                if ((k === 'arrowdown' || k === 's' || k === 'ы') && this.dir.y === 0) this.nextDir = { x: 0, y: 1 };
                if ((k === 'arrowleft' || k === 'a' || k === 'ф') && this.dir.x === 0) this.nextDir = { x: -1, y: 0 };
                if ((k === 'arrowright' || k === 'd' || k === 'в') && this.dir.x === 0) this.nextDir = { x: 1, y: 0 };
            };
            window.addEventListener('keydown', this.onKeyDown);
        }
        spawnApple() {
            this.apple.x = Math.floor(Math.random() * this.gridSize);
            this.apple.y = Math.floor(Math.random() * this.gridSize);
            for (let segment of this.snake) {
                if (segment.x === this.apple.x && segment.y === this.apple.y) {
                    this.spawnApple();
                    break;
                }
            }
        }
        loop(timestamp) {
            if (!this.alive) return;
            if (timestamp - this.lastTick > this.speed) {
                this.lastTick = timestamp;
                this.dir = this.nextDir;
                let head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

                if (this.mode === 'classic') {
                    if (head.x < 0) head.x = this.gridSize - 1;
                    if (head.x >= this.gridSize) head.x = 0;
                    if (head.y < 0) head.y = this.gridSize - 1;
                    if (head.y >= this.gridSize) head.y = 0;
                } else {
                    if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
                        this.gameOver();
                        return;
                    }
                }

                // Движение вперед до проверки коллизий (исправление бага ложного хвоста)
                this.snake.unshift(head);

                if (head.x === this.apple.x && head.y === this.apple.y) {
                    this.score++;
                    const scoreView = document.getElementById('current-game-score');
                    if (scoreView) scoreView.innerText = this.score;
                    triggerScreenShake();
                    
                    for (let i = 0; i < 15; i++) {
                        this.particles.push(new Particle(this.apple.x * this.tile + this.tile / 2, this.apple.y * this.tile + this.tile / 2, '#FFD60A'));
                    }
                    this.spawnApple();
                    if (this.speed > 55) this.speed -= 2;
                } else {
                    this.snake.pop();
                }

                // Честная проверка на самопересечение после обновления хвоста
                for (let i = 1; i < this.snake.length; i++) {
                    if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                        this.gameOver();
                        return;
                    }
                }
            }

            // Рендеринг сцены
            this.ctx.fillStyle = '#060810';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Свечение яблока
            this.ctx.fillStyle = '#FFD60A';
            this.ctx.shadowColor = '#FFD60A';
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(this.apple.x * this.tile + this.tile / 2, this.apple.y * this.tile + this.tile / 2, this.tile * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;

            // Отрисовка тела змеи
            this.ctx.fillStyle = this.skinColor;
            this.snake.forEach((segment) => {
                this.ctx.fillRect(segment.x * this.tile + 1, segment.y * this.tile + 1, this.tile - 2, this.tile - 2);
            });

            // Обновление и отрисовка частиц
            for (let i = this.particles.length - 1; i >= 0; i--) {
                this.particles[i].update();
                this.particles[i].draw(this.ctx);
                if (this.particles[i].alpha <= 0) this.particles.splice(i, 1);
            }

            requestAnimationFrame((time) => this.loop(time));
        }
        gameOver() {
            this.alive = false;
            triggerScreenShake();
            saveBestScore('snake', this.mode, this.score);
            alert(`Игра Окончена! Ваш счет: ${this.score}`);
            updateWallet(this.score);
            navigateTo('screen-lobby');
        }
        destroy() {
            this.alive = false;
            window.removeEventListener('keydown', this.onKeyDown);
        }
    }

    // --- 2. ДВИЖОК: TAP REACTOR (РЕАКТОР КЛИКОВ) ---
    class TapReactor {
        constructor(canvas, mode) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.mode = mode;
            this.circles = [];
            this.particles = [];
            this.score = 0;
            this.alive = true;
            this.spawnTimer = null;
            
            this.onPointerDown = (e) => this.handleTap(e);
            this.canvas.addEventListener('pointerdown', this.onPointerDown);
            
            this.startSpawning();
            this.loop();
        }
        startSpawning() {
            if (!this.alive) return;
            let type = 'normal';
            let color = STATE.activeSkin;
            
            if (this.mode === 'chaos') {
                const rand = Math.random();
                if (rand < 0.18) { type = 'bomb'; color = '#FF453A'; }
                else if (rand < 0.32) { type = 'gold'; color = '#FFD60A'; }
            }

            this.circles.push({
                x: Math.random() * (this.canvas.width - 70) + 35,
                y: Math.random() * (this.canvas.height - 70) + 35,
                radius: 0,
                maxRadius: 38,
                color: color,
                type: type,
                life: 100,
                growth: Math.random() * 1.5 + 1.5
            });

            const nextSpawn = this.mode === 'chaos' ? Math.random() * 400 + 250 : Math.random() * 600 + 400;
            this.spawnTimer = setTimeout(() => this.startSpawning(), nextSpawn);
        }
        handleTap(e) {
            const rect = this.canvas.getBoundingClientRect();
            const tapX = e.clientX - rect.left;
            const tapY = e.clientY - rect.top;

            for (let i = this.circles.length - 1; i >= 0; i--) {
                let c = this.circles[i];
                let distance = Math.hypot(tapX - c.x, tapY - c.y);

                if (distance <= c.maxRadius + 5) {
                    this.circles.splice(i, 1);
                    triggerScreenShake();

                    for (let k = 0; k < 20; k++) {
                        this.particles.push(new Particle(c.x, c.y, c.color));
                    }

                    if (c.type === 'bomb') {
                        this.score = Math.max(0, this.score - 15);
                        triggerScreenShake();
                    } else if (c.type === 'gold') {
                        this.score += 6;
                        updateWallet(4);
                    } else {
                        this.score += 2;
                    }

                    const scoreView = document.getElementById('current-game-score');
                    if (scoreView) scoreView.innerText = this.score;
                    return;
                }
            }
        }
        loop() {
            if (!this.alive) return;

            this.ctx.fillStyle = '#060810';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            for (let i = this.circles.length - 1; i >= 0; i--) {
                let c = this.circles[i];
                if (c.radius < c.maxRadius) c.radius += c.growth;
                c.life -= (this.mode === 'chaos' ? 1.2 : 0.7);

                if (c.life <= 0) {
                    this.circles.splice(i, 1);
                    if (c.type === 'normal' && this.mode === 'chaos') {
                        this.score = Math.max(0, this.score - 3);
                    }
                    continue;
                }

                this.ctx.save();
                this.ctx.globalAlpha = c.life / 100;
                this.ctx.fillStyle = c.color;
                this.ctx.shadowColor = c.color;
                this.ctx.shadowBlur = 15;
                this.ctx.beginPath();
                this.ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                if (c.type === 'bomb') {
                    this.ctx.fillStyle = '#000000';
                    this.ctx.font = '16px sans-serif';
                    this.ctx.fillText('💣', c.x - 8, c.y + 5);
                }
                this.ctx.restore();
            }

            for (let i = this.particles.length - 1; i >= 0; i--) {
                this.particles[i].update();
                this.particles[i].draw(this.ctx);
                if (this.particles[i].alpha <= 0) this.particles.splice(i, 1);
            }

            const scoreView = document.getElementById('current-game-score');
            if (scoreView) scoreView.innerText = this.score;

            requestAnimationFrame(() => this.loop());
        }
        destroy() {
            this.alive = false;
            clearTimeout(this.spawnTimer);
            this.canvas.removeEventListener('pointerdown', this.onPointerDown);
            // Сохраняем рекорд только при закрытии/смерти движка, а не на каждом кадре!
            saveBestScore('reactor', this.mode, this.score);
        }
    }

    // --- 3. ДВИЖОК: BLOCK BLAST (РАЗРУШЕНИЕ БЛОКОВ) ---
    class BlockBlast {
        constructor(canvas, mode) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.mode = mode;
            this.cols = 8;
            this.rows = 8;
            this.cellW = canvas.width / this.cols;
            this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
            this.particles = [];
            this.score = 0;
            this.alive = true;
            this.ticks = 0;

            this.onPointerDown = (e) => this.handleGridClick(e);
            this.canvas.addEventListener('pointerdown', this.onPointerDown);
            this.loop();
        }
        handleGridClick(e) {
            const rect = this.canvas.getBoundingClientRect();
            const cellX = Math.floor((e.clientX - rect.left) / this.cellW);
            const cellY = Math.floor((e.clientY - rect.top) / this.cellW);

            if (cellX >= 0 && cellX < this.cols && cellY >= 0 && cellY < this.rows) {
                if (this.grid[cellY][cellX]) {
                    let blockColor = this.grid[cellY][cellX];
                    this.grid[cellY][cellX] = null;
                    this.score += 10;
                    triggerScreenShake();

                    for (let i = 0; i < 15; i++) {
                        this.particles.push(new Particle(cellX * this.cellW + this.cellW / 2, cellY * this.cellW + this.cellW / 2, blockColor));
                    }
                    this.scanAndClearLines();
                }
            }
        }
        scanAndClearLines() {
            let rowsToClear = [];
            let colsToClear = [];

            // Проверка горизонталей
            for (let r = 0; r < this.rows; r++) {
                let rowFull = true;
                for (let c = 0; c < this.cols; c++) {
                    if (!this.grid[r][c]) { rowFull = false; break; }
                }
                if (rowFull) rowsToClear.push(r);
            }

            // Проверка вертикалей (исправление бага)
            for (let c = 0; c < this.cols; c++) {
                let colFull = true;
                for (let r = 0; r < this.rows; r++) {
                    if (!this.grid[r][c]) { colFull = false; break; }
                }
                if (colFull) colsToClear.push(c);
            }

            // Очистка и начисление очков
            rowsToClear.forEach(r => {
                this.score += 100;
                this.grid[r].fill(null);
            });

            colsToClear.forEach(c => {
                this.score += 100;
                for (let r = 0; r < this.rows; r++) {
                    this.grid[r][c] = null;
                }
            });
        }
        loop() {
            if (!this.alive) return;
            this.ticks++;

            let spawnRate = Math.max(15, 35 - Math.floor(this.score / 200));
            if (this.ticks > spawnRate) {
                this.ticks = 0;
                let attempts = 0;
                while (attempts < 20) {
                    let rx = Math.floor(Math.random() * this.cols);
                    let ry = Math.floor(Math.random() * this.rows);
                    if (!this.grid[ry][rx]) {
                        this.grid[ry][rx] = STATE.activeSkin;
                        break;
                    }
                    attempts++;
                }

                let blocksCount = 0;
                this.grid.forEach(row => row.forEach(cell => { if (cell) blocksCount++; }));
                if (blocksCount > 48) {
                    this.alive = false;
                    saveBestScore('blockblast', this.mode, this.score);
                    alert(`Матрица Переполнена! Набрано очков: ${this.score}`);
                    updateWallet(Math.floor(this.score / 6));
                    navigateTo('screen-lobby');
                    return;
                }
            }

            this.ctx.fillStyle = '#060810';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
                    this.ctx.strokeRect(c * this.cellW, r * this.cellW, this.cellW, this.cellW);
                    if (this.grid[r][c]) {
                        this.ctx.fillStyle = this.grid[r][c];
                        this.ctx.fillRect(c * this.cellW + 3, r * this.cellW + 3, this.cellW - 6, this.cellW - 6);
                    }
                }
            }

            for (let i = this.particles.length - 1; i >= 0; i--) {
                this.particles[i].update();
                this.particles[i].draw(this.ctx);
                if (this.particles[i].alpha <= 0) this.particles.splice(i, 1);
            }

            const scoreView = document.getElementById('current-game-score');
            if (scoreView) scoreView.innerText = this.score;

            requestAnimationFrame(() => this.loop());
        }
        destroy() {
            this.alive = false;
            this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        }
    }

    // --- 4. ДВИЖОК: CYBER DASH (КИБЕРРАННЕР С ГРАВИТАЦИЕЙ) ---
    class CyberDash {
        constructor(canvas, mode) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.mode = mode;
            this.player = { x: 60, y: canvas.height / 2, w: 22, h: 22, vy: 0, gravity: 0.65, isUp: false };
            this.obstacles = [];
            this.particles = [];
            this.score = 0;
            this.alive = true;
            this.frameCount = 0;

            this.onPointerDown = () => this.switchGravity();
            this.canvas.addEventListener('pointerdown', this.onPointerDown);
            this.loop();
        }
        switchGravity() {
            this.player.isUp = !this.player.isUp;
            this.player.gravity = this.player.isUp ? -0.65 : 0.65;
            for (let i = 0; i < 8; i++) {
                this.particles.push(new Particle(this.player.x + 11, this.player.y + 11, STATE.activeSkin));
            }
        }
        loop() {
            if (!this.alive) return;
            this.frameCount++;

            this.player.vy += this.player.gravity;
            this.player.y += this.player.vy;

            if (this.player.y < 0) { this.player.y = 0; this.player.vy = 0; }
            if (this.player.y > this.canvas.height - this.player.h) {
                this.player.y = this.canvas.height - this.player.h;
                this.player.vy = 0;
            }

            let spawnInterval = Math.max(45, 75 - Math.floor(this.score / 150));
            if (this.frameCount % spawnInterval === 0) {
                let obsH = Math.random() * 130 + 40;
                let attachToCeil = Math.random() > 0.5;
                this.obstacles.push({
                    x: this.canvas.width,
                    y: attachToCeil ? 0 : this.canvas.height - obsH,
                    w: 26,
                    h: obsH
                });
            }

            this.ctx.fillStyle = '#060810';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = STATE.activeSkin;
            this.ctx.shadowColor = STATE.activeSkin;
            this.ctx.shadowBlur = 8;
            this.ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);
            this.ctx.shadowBlur = 0;

            this.ctx.fillStyle = '#FF375F';
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                let o = this.obstacles[i];
                o.x -= (4.5 + Math.min(3, this.score / 400));
                
                this.ctx.fillRect(o.x, o.y, o.w, o.h);

                if (this.player.x < o.x + o.w && this.player.x + this.player.w > o.x &&
                    this.player.y < o.y + o.h && this.player.y + this.player.h > o.y) {
                    this.alive = false;
                    triggerScreenShake();
                    saveBestScore('cyberdash', this.mode, this.score);
                    alert(`Авария Крах Системы! Набрано очков: ${this.score}`);
                    updateWallet(Math.floor(this.score / 4));
                    navigateTo('screen-lobby');
                    return;
                }

                if (o.x + o.w < 0) {
                    this.obstacles.splice(i, 1);
                    this.score += 15;
                }
            }

            if (this.frameCount % 3 === 0) {
                this.particles.push(new Particle(this.player.x, this.player.y + 11, 'rgba(255,255,255,0.3)'));
            }

            for (let i = this.particles.length - 1; i >= 0; i--) {
                this.particles[i].update();
                this.particles[i].draw(this.ctx);
                if (this.particles[i].alpha <= 0) this.particles.splice(i, 1);
            }

            const scoreView = document.getElementById('current-game-score');
            if (scoreView) scoreView.innerText = this.score;

            requestAnimationFrame(() => this.loop());
        }
        destroy() {
            this.alive = false;
            this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        }
    }

    // ============================================================================
    // СИСТЕМА УПРАВЛЕНИЯ ИНТЕРФЕЙСОМ И НАВИГАЦИЕЙ (CORE SYSTEM)
    // ============================================================================

    function triggerScreenShake() {
        const rootContainer = document.getElementById('game-root-container');
        if (rootContainer) {
            rootContainer.classList.add('shake');
            setTimeout(() => rootContainer.classList.remove('shake'), 300);
        }
    }

    function getBestScore(game, mode) {
        try {
            return parseInt(localStorage.getItem(`best_${game}_${mode}`)) || 0;
        } catch (e) { return 0; }
    }

    function saveBestScore(game, mode, score) {
        try {
            const currentBest = getBestScore(game, mode);
            if (score > currentBest) {
                localStorage.setItem(`best_${game}_${mode}`, score);
            }
        } catch (e) {}
    }

    function navigateTo(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) targetScreen.classList.add('active'); // Исправление критического бага (.classList.add)
        
        document.querySelectorAll('.screen').forEach(screen => {
            if (screen.id === screenId) screen.classList.add('active');
        });
    }

    function updateWallet(amount) {
        STATE.coins += amount;
        try {
            localStorage.setItem('nexus_coins', STATE.coins);
        } catch (e) {}
        const coinsCounter = document.getElementById('player-coins');
        if (coinsCounter) coinsCounter.innerText = STATE.coins;
    }

    // ГЛАВНЫЙ ИНИЦИАЛИЗАТОР СОБЫТИЙ СТРАНИЦЫ
    document.addEventListener('DOMContentLoaded', () => {
        if (STATE.user) {
            handleLoginSuccess(STATE.user);
        }

        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                const usernameInput = document.getElementById('username-input');
                const name = usernameInput ? usernameInput.value.trim() : "";
                if (name.length < 2) return alert('Имя профиля слишком короткое!');
                
                STATE.user = name;
                try {
                    localStorage.setItem('nexus_user', name);
                } catch (e) {}
                handleLoginSuccess(name);
            });
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                try {
                    localStorage.clear();
                } catch (e) {}
                location.reload();
            });
        }

        document.querySelectorAll('.dock-item').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.id === 'logout-btn') return;
                document.querySelectorAll('.dock-item').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-page').forEach(t => t.classList.remove('active'));
                
                btn.classList.add('active');
                const targetTab = document.getElementById(btn.dataset.tab);
                if (targetTab) targetTab.classList.add('active');
            });
        });

        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                STATE.selectedGame = card.dataset.game;
                setupModeScreen();
            });
        });

        const backToLobby = document.getElementById('back-to-lobby-btn');
        if (backToLobby) backToLobby.addEventListener('click', () => navigateTo('screen-lobby'));

        const startGameBtn = document.getElementById('start-game-final-btn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                if (STATE.selectedGame && STATE.selectedMode) {
                    launchGame(STATE.selectedGame, STATE.selectedMode);
                }
            });
        }

        const exitGameBtn = document.getElementById('exit-game-btn');
        if (exitGameBtn) {
            exitGameBtn.addEventListener('click', () => {
                if (STATE.currentGameEngine) {
                    STATE.currentGameEngine.destroy();
                    STATE.currentGameEngine = null;
                }
                const viewport = document.getElementById('game-viewport');
                if (viewport) viewport.innerHTML = '';
                navigateTo('screen-lobby');
            });
        }

        renderShop();
    });

    function handleLoginSuccess(name) {
        const profileName = document.getElementById('player-name');
        const walletCoins = document.getElementById('player-coins');
        if (profileName) profileName.innerText = name;
        if (walletCoins) walletCoins.innerText = STATE.coins;
        navigateTo('screen-lobby');
    }

    function setupModeScreen() {
        navigateTo('screen-mode-select');
        const container = document.getElementById('mode-options-container');
        if (!container) return;
        container.innerHTML = '';

        const modes = GAME_MODES[STATE.selectedGame];
        if (!modes || modes.length === 0) return;
        
        STATE.selectedMode = modes[0].id;

        const modeTitle = document.getElementById('mode-title');
        const bestScoreLabel = document.getElementById('mode-best-score');
        
        if (modeTitle) modeTitle.innerText = `Nexus // Конфигурация Режима`;
        if (bestScoreLabel) bestScoreLabel.innerText = getBestScore(STATE.selectedGame, STATE.selectedMode);

        modes.forEach((m, index) => {
            const btn = document.createElement('button');
            btn.className = `mode-btn ${index === 0 ? 'selected' : ''}`;
            btn.innerHTML = `<strong>${m.name}</strong><br><small style="color:var(--text-muted); font-size:11px;">${m.desc}</small>`;
            
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                STATE.selectedMode = m.id;
                if (bestScoreLabel) bestScoreLabel.innerText = getBestScore(STATE.selectedGame, STATE.selectedMode);
            });
            container.appendChild(btn);
        });
    }

    function renderShop() {
        const shopContainer = document.getElementById('skins-container');
        if (!shopContainer) return;
        shopContainer.innerHTML = '';

        SHOP_CATALOG.forEach(item => {
            const isPurchased = STATE.skins.includes(item.id);
            const isEquipped = STATE.activeSkin === item.id;
            
            const card = document.createElement('div');
            card.className = 'skin-card';
            card.innerHTML = `
                <div class="skin-preview" style="background-color: ${item.id}; box-shadow: 0 0 10px ${item.id}44;"></div>
                <h4>${item.name}</h4>
                <button class="buy-btn ${isEquipped ? 'equipped' : isPurchased ? 'bought' : ''}">
                    ${isEquipped ? 'Надето' : isPurchased ? 'Надеть' : item.price + ' 🪙'}
                </button>
            `;

            card.querySelector('.buy-btn').addEventListener('click', () => {
                if (isEquipped) return;
                if (isPurchased) {
                    STATE.activeSkin = item.id;
                    try { localStorage.setItem('nexus_active_skin', item.id); } catch (e) {}
                } else if (STATE.coins >= item.price) {
                    updateWallet(-item.price);
                    STATE.skins.push(item.id);
                    STATE.activeSkin = item.id;
                    try {
                        localStorage.setItem('nexus_skins', JSON.stringify(STATE.skins));
                        localStorage.setItem('nexus_active_skin', item.id);
                    } catch (e) {}
                } else {
                    return alert('Недостаточно энерго-монет на балансе!');
                }
                renderShop();
            });

            shopContainer.appendChild(card);
        });
    }

    function launchGame(game, mode) {
        if (STATE.currentGameEngine) {
            STATE.currentGameEngine.destroy();
            STATE.currentGameEngine = null;
        }

        navigateTo('screen-game');
        const viewport = document.getElementById('game-viewport');
        if (!viewport) return;
        
        viewport.innerHTML = '<canvas id="game-canvas"></canvas>';
        const canvas = document.getElementById('game-canvas');
        
        const calculatedSize = Math.min(window.innerWidth * 0.90, 450);
        canvas.width = calculatedSize;
        canvas.height = calculatedSize;

        if (game === 'snake') STATE.currentGameEngine = new SeniorSnake(canvas, mode);
        if (game === 'reactor') STATE.currentGameEngine = new TapReactor(canvas, mode);
        if (game === 'blockblast') STATE.currentGameEngine = new BlockBlast(canvas, mode);
        if (game === 'cyberdash') STATE.currentGameEngine = new CyberDash(canvas, mode);
    }

})();
