// --- ХРАНИЛИЩЕ ДАННЫХ И СОСТОЯНИЯ (SENIOR ARCHITECTURE) ---
const STATE = {
    user: localStorage.getItem('nexus_user') || null,
    coins: parseInt(localStorage.getItem('nexus_coins')) || 100,
    skins: JSON.parse(localStorage.getItem('nexus_skins')) || ['#00EF72'],
    activeSkin: localStorage.getItem('nexus_active_skin') || '#00EF72',
    currentGameEngine: null,
    selectedGame: null,
    selectedMode: null
};

// Конфиги режимов и рекордов
const GAME_MODES = {
    snake: [
        { id: 'classic', name: 'Классика (Без Стен)', desc: 'Свободное перемещение сквозь края' },
        { id: 'hardcore', name: 'Хардкор (Летальные Стены)', desc: 'Врезание в стену = мгновенная смерть' }
    ],
    reactor: [
        { id: 'zen', name: 'Дзен Режим', desc: 'Только очки, нет штрафов' },
        { id: 'chaos', name: 'Хаос Элементы', desc: 'Появляются Бомбы и Золотые монеты' }
    ],
    blockblast: [
        { id: 'arcade', name: 'Аркадный Бласт', desc: 'Удаляй линии, скорость растет' }
    ],
    cyberdash: [
        { id: 'neon', name: 'Бесконечный Неон', desc: 'Изменяй гравитацию и выживай' }
    ]
};

const SHOP_CATALOG = [
    { id: '#00EF72', name: 'Acid Neon', price: 0 },
    { id: '#0A84FF', name: 'Deep Space', price: 100 },
    { id: '#BF5AF2', name: 'Cyberpunk', price: 250 },
    { id: '#FF9F0A', name: 'Supernova', price: 500 },
    { id: '#FF375F', name: 'Bloody Mary', price: 800 }
];

// --- ВСПОМОГАТЕЛЬНЫЕ FX КЛАССЫ (JUICE ENGINE) ---
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.radius = Math.random() * 3 + 2;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.015;
    }
    update() { this.x += this.vx; this.y += this.vy; this.alpha -= this.decay; }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = this.color;
        ctx.shadowColor = this.color; ctx.shadowBlur = 10; ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
}

function triggerScreenShake() {
    const root = document.getElementById('game-root-container');
    root.classList.add('shake');
    setTimeout(() => root.classList.remove('shake'), 350);
}

function getBestScore(game, mode) { return parseInt(localStorage.getItem(`best_${game}_${mode}`)) || 0; }
function saveBestScore(game, mode, score) {
    if (score > getBestScore(game, mode)) { localStorage.setItem(`best_${game}_${mode}`, score); }
}

function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function updateWallet(amount) {
    STATE.coins += amount; localStorage.setItem('nexus_coins', STATE.coins);
    document.getElementById('player-coins').innerText = STATE.coins;
}

// --- ИНИЦИАЛИЗАЦИЯ И ИНТЕРФЕЙС ---
document.addEventListener('DOMContentLoaded', () => {
    if (STATE.user) { loginSuccess(STATE.user); }

    document.getElementById('login-btn').addEventListener('click', () => {
        const name = document.getElementById('username-input').value.trim();
        if (name.length < 2) return alert('Имя слишком короткое!');
        STATE.user = name; localStorage.setItem('nexus_user', name);
        loginSuccess(name);
    });

    document.getElementById('logout-btn').addEventListener('click', () => { localStorage.clear(); location.reload(); });

    document.querySelectorAll('.dock-item').forEach(btn => {
        btn.addEventListener('click', () => {
            if(btn.id === 'logout-btn') return;
            document.querySelectorAll('.dock-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-page').forEach(t => t.classList.remove('active'));
            btn.classList.add('active'); document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Экран настройки мода
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            STATE.selectedGame = card.dataset.game;
            setupModeScreen();
        });
    });

    document.getElementById('back-to-lobby-btn').addEventListener('click', () => navigateTo('screen-lobby'));
    
    document.getElementById('start-game-final-btn').addEventListener('click', () => {
        launchGame(STATE.selectedGame, STATE.selectedMode);
    });

    document.getElementById('exit-game-btn').addEventListener('click', () => {
        if(STATE.currentGameEngine) STATE.currentGameEngine.destroy();
        document.getElementById('game-viewport').innerHTML = '';
        navigateTo('screen-lobby');
    });

    renderShop();
});

function loginSuccess(name) {
    document.getElementById('player-name').innerText = name;
    document.getElementById('player-coins').innerText = STATE.coins;
    navigateTo('screen-lobby');
}

function setupModeScreen() {
    navigateTo('screen-mode-select');
    const container = document.getElementById('mode-options-container');
    container.innerHTML = '';
    
    const modes = GAME_MODES[STATE.selectedGame];
    STATE.selectedMode = modes[0].id; // По умолчанию первый

    document.getElementById('mode-title').innerText = `Nexus // Выберите режим`;
    document.getElementById('mode-best-score').innerText = getBestScore(STATE.selectedGame, STATE.selectedMode);

    modes.forEach((m, idx) => {
        const b = document.createElement('button');
        b.className = `mode-btn ${idx === 0 ? 'selected' : ''}`;
        b.innerHTML = `<strong>${m.name}</strong><br><small style="color:var(--text-muted)">${m.desc}</small>`;
        b.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('selected'));
            b.classList.add('selected');
            STATE.selectedMode = m.id;
            document.getElementById('mode-best-score').innerText = getBestScore(STATE.selectedGame, STATE.selectedMode);
        });
        container.appendChild(b);
    });
}

// --- МАГАЗИН ---
function renderShop() {
    const container = document.getElementById('skins-container'); container.innerHTML = '';
    SHOP_CATALOG.forEach(item => {
        const isBought = STATE.skins.includes(item.id); const isEquipped = STATE.activeSkin === item.id;
        const card = document.createElement('div'); card.className = 'skin-card';
        card.innerHTML = `
            <div class="skin-preview" style="background-color: ${item.id}; color: ${item.id}"></div>
            <h4>${item.name}</h4>
            <button class="buy-btn ${isEquipped ? 'equipped' : isBought ? 'bought' : ''}">
                ${isEquipped ? 'Надето' : isBought ? 'Надеть' : item.price + ' 🪙'}
            </button>
        `;
        card.querySelector('.buy-btn').addEventListener('click', () => {
            if (isBought) { STATE.activeSkin = item.id; localStorage.setItem('nexus_active_skin', item.id); } 
            else if (STATE.coins >= item.price) {
                updateWallet(-item.price); STATE.skins.push(item.id); STATE.activeSkin = item.id;
                localStorage.setItem('nexus_skins', JSON.stringify(STATE.skins)); localStorage.setItem('nexus_active_skin', item.id);
            } else { return alert('Маловато монет!'); }
            renderShop();
        });
        container.appendChild(card);
    });
}

function launchGame(game, mode) {
    navigateTo('screen-game');
    const vp = document.getElementById('game-viewport');
    vp.innerHTML = '<canvas id="game-canvas"></canvas>';
    const canvas = document.getElementById('game-canvas');
    const size = Math.min(window.innerWidth * 0.92, 460);
    canvas.width = size; canvas.height = size;

    if(game === 'snake') STATE.currentGameEngine = new SeniorSnake(canvas, mode);
    if(game === 'reactor') STATE.currentGameEngine = new TapReactor(canvas, mode);
    if(game === 'blockblast') STATE.currentGameEngine = new BlockBlast(canvas, mode);
    if(game === 'cyberdash') STATE.currentGameEngine = new CyberDash(canvas, mode);
}


/* ========================================================================
   ИГРА 1: UPGRADED NEON SNAKE 2.0 (Эффекты взрывов, Комбо, Тряска)
======================================================================== */
class SeniorSnake {
    constructor(canvas, mode) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.mode = mode;
        this.gridSize = 20; this.tile = canvas.width / this.gridSize;
        this.snake = [{x: 10, y: 10}]; this.dir = {x: 1, y: 0}; this.nextDir = {x: 1, y: 0};
        this.apple = {x: 5, y: 5}; this.particles = []; this.score = 0;
        this.speed = 120; this.lastTick = 0; this.alive = true;
        this.skinColor = STATE.activeSkin; this.spawnApple(); this.bind();
        this.loop(0);
    }
    bind() {
        this.kd = e => {
            const k = e.key;
            if ((k==='ArrowUp'||k==='w') && this.dir.y===0) this.nextDir={x:0,y:-1};
            if ((k==='ArrowDown'||k==='s') && this.dir.y===0) this.nextDir={x:0,y:1};
            if ((k==='ArrowLeft'||k==='a') && this.dir.x===0) this.nextDir={x:-1,y:0};
            if ((k==='ArrowRight'||k==='d') && this.dir.x===0) this.nextDir={x:1,y:0};
        };
        window.addEventListener('keydown', this.kd);
    }
    spawnApple() {
        this.apple.x = Math.floor(Math.random()*this.gridSize);
        this.apple.y = Math.floor(Math.random()*this.gridSize);
    }
    loop(t) {
        if(!this.alive) return;
        if(t - this.lastTick > this.speed) {
            this.lastTick = t; this.dir = this.nextDir;
            let head = {x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y};

            if(this.mode === 'classic') {
                if(head.x<0) head.x=this.gridSize-1; if(head.x>=this.gridSize) head.x=0;
                if(head.y<0) head.y=this.gridSize-1; if(head.y>=this.gridSize) head.y=0;
            } else {
                if(head.x<0 || head.x>=this.gridSize || head.y<0 || head.y>=this.gridSize) { this.gameOver(); return; }
            }

            for(let p of this.snake) { if(p.x===head.x && p.y===head.y) { this.gameOver(); return; } }
            this.snake.unshift(head);

            if(head.x === this.apple.x && head.y === this.apple.y) {
                this.score++; document.getElementById('current-game-score').innerText = this.score;
                triggerScreenShake();
                for(let i=0;i<15;i++) this.particles.push(new Particle(this.apple.x*this.tile+this.tile/2, this.apple.y*this.tile+this.tile/2, '#FFD60A'));
                this.spawnApple();
                if(this.speed > 60) this.speed -= 2;
            } else { this.snake.pop(); }
        }

        this.ctx.fillStyle = '#060810'; this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        
        // Отрисовка Яблока
        this.ctx.fillStyle = '#FFD60A'; this.ctx.beginPath();
        this.ctx.arc(this.apple.x*this.tile+this.tile/2, this.apple.y*this.tile+this.tile/2, this.tile*0.4, 0, Math.PI*2); this.ctx.fill();

        // Отрисовка Змейки
        this.ctx.fillStyle = this.skinColor;
        this.snake.forEach(p => this.ctx.fillRect(p.x*this.tile+1, p.y*this.tile+1, this.tile-2, this.tile-2));

        // Рендер Частиц
        this.particles.forEach((p,i) => { p.update(); p.draw(this.ctx); if(p.alpha<=0) this.particles.splice(i,1); });

        requestAnimationFrame((time)=>this.loop(time));
    }
    gameOver() {
        this.alive = false; triggerScreenShake();
        saveBestScore('snake', this.mode, this.score);
        alert(`Игра Окончена! Счёт: ${this.score}`);
        updateWallet(this.score); navigateTo('screen-lobby');
    }
    destroy() { this.alive = false; window.removeEventListener('keydown', this.kd); }
}


/* ========================================================================
   ИГРА 2: UPGRADED TAP REACTOR (Кастомные Неоновые Типы Бомб и Бонусов)
======================================================================== */
class TapReactor {
    constructor(canvas, mode) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.mode = mode;
        this.circles = []; this.particles = []; this.score = 0; this.alive = true;
        this.canvas.addEventListener('pointerdown', (e)=>this.tap(e));
        this.spawn(); this.loop();
    }
    spawn() {
        if(!this.alive) return;
        let type = 'normal'; let color = STATE.activeSkin;
        if(this.mode === 'chaos') {
            let r = Math.random();
            if(r < 0.15) { type = 'bomb'; color = '#FF453A'; }
            else if(r < 0.3) { type = 'gold'; color = '#FFD60A'; }
        }
        this.circles.push({
            x: Math.random()*(this.canvas.width-60)+30, y: Math.random()*(this.canvas.height-60)+30,
            radius: 0, maxRadius: 35, color: color, type: type, life: 100
        });
        setTimeout(()=>this.spawn(), Math.random()*500 + 300);
    }
    tap(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        for(let i=this.circles.length-1; i>=0; i--) {
            let c = this.circles[i];
            if(Math.hypot(x-c.x, y-c.y) <= c.maxRadius) {
                this.circles.splice(i,1); triggerScreenShake();
                for(let k=0;k<20;k++) this.particles.push(new Particle(c.x, c.y, c.color));
                
                if(c.type === 'bomb') { this.score = Math.max(0, this.score - 10); }
                else if(c.type === 'gold') { this.score += 5; updateWallet(5); }
                else { this.score += 2; }
                
                document.getElementById('current-game-score').innerText = this.score;
                return;
            }
        }
    }
    loop() {
        if(!this.alive) return;
        this.ctx.fillStyle = '#060810'; this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);

        for(let i=this.circles.length-1; i>=0; i--) {
            let c = this.circles[i]; if(c.radius < c.maxRadius) c.radius += 2.5;
            c.life -= 0.8;
            if(c.life <= 0) { this.circles.splice(i,1); if(c.type==='normal'&&this.mode==='chaos') this.score=Math.max(0,this.score-2); continue; }

            this.ctx.save(); this.ctx.globalAlpha = c.life/100; this.ctx.fillStyle = c.color;
            this.ctx.beginPath(); this.ctx.arc(c.x, c.y, c.radius, 0, Math.PI*2); this.ctx.fill();
            if(c.type==='bomb') { this.ctx.fillStyle='#000'; this.ctx.font='14px sans-serif'; this.ctx.fillText('💣', c.x-7, c.y+5); }
            this.ctx.restore();
        }

        this.particles.forEach((p,i) => { p.update(); p.draw(this.ctx); if(p.alpha<=0) this.particles.splice(i,1); });
        document.getElementById('current-game-score').innerText = this.score;
        saveBestScore('reactor', this.mode, this.score);
        requestAnimationFrame(()=>this.loop());
    }
    destroy() { this.alive = false; }
}


/* ========================================================================
   НОВАЯ ИГРА 3: BLOCK BLAST ARCADE (Логический Ударный Ритм-Матч)
======================================================================== */
class BlockBlast {
    constructor(canvas, mode) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.mode = mode;
        this.cols = 8; this.rows = 8; this.w = canvas.width / this.cols;
        this.grid = Array(this.rows).fill().map(() => Array(this.cols).fill(null));
        this.particles = []; this.score = 0; this.alive = true;
        this.spawnBlockTimer = 0;
        this.canvas.addEventListener('pointerdown', (e)=>this.click(e));
        this.loop();
    }
    click(e) {
        const rect = this.canvas.getBoundingClientRect();
        const cx = Math.floor((e.clientX - rect.left)/this.w);
        const cy = Math.floor((e.clientY - rect.top)/this.w);
        
        if(cx>=0 && cx<this.cols && cy>=0 && cy<this.rows && this.grid[cy][cx]) {
            let color = this.grid[cy][cx]; this.grid[cy][cx] = null;
            this.score += 10; triggerScreenShake();
            for(let i=0;i<12;i++) this.particles.push(new Particle(cx*this.w+this.w/2, cy*this.w+this.w/2, color));
            this.checkLines();
        }
    }
    checkLines() {
        // Если ряд пустой, начисляем супер-бонусы за полную очистку
        for(let r=0; r<this.rows; r++) {
            let empty = true; for(let c=0; c<this.cols; c++) { if(this.grid[r][c]) empty = false; }
            if(empty) { this.score += 50; }
        }
    }
    loop() {
        if(!this.alive) return;
        this.spawnBlockTimer++;
        if(this.spawnBlockTimer > 40) {
            this.spawnBlockTimer = 0;
            let rx = Math.floor(Math.random()*this.cols); let ry = Math.floor(Math.random()*this.rows);
            this.grid[ry][rx] = STATE.activeSkin;
            
            // Проверка на переполнение поля (Конец Игры)
            let total = 0; this.grid.forEach(r => r.forEach(c => { if(c) total++; }));
            if(total > 45) {
                this.alive = false; saveBestScore('blockblast', this.mode, this.score);
                alert(`Поле заполнено! Счёт: ${this.score}`); updateWallet(Math.floor(this.score/5));
                navigateTo('screen-lobby'); return;
            }
        }

        this.ctx.fillStyle = '#060810'; this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);

        // Рендер Сетки Блоков
        for(let r=0; r<this.rows; r++) {
            for(let c=0; c<this.cols; c++) {
                this.ctx.strokeStyle = 'rgba(255,255,255,0.02)';
                this.ctx.strokeRect(c*this.w, r*this.w, this.w, this.w);
                if(this.grid[r][c]) {
                    this.ctx.fillStyle = this.grid[r][c];
                    this.ctx.fillRect(c*this.w+2, r*this.w+2, this.w-4, this.w-4);
                }
            }
        }

        this.particles.forEach((p,i) => { p.update(); p.draw(this.ctx); if(p.alpha<=0) this.particles.splice(i,1); });
        document.getElementById('current-game-score').innerText = this.score;
        requestAnimationFrame(()=>this.loop());
    }
    destroy() { this.alive = false; }
}


/* ========================================================================
   НОВАЯ ИГРА 4: CYBER DASH (Гравитационный Раннер на реакцию)
======================================================================== */
class CyberDash {
    constructor(canvas, mode) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.mode = mode;
        this.player = { x: 50, y: canvas.height/2, w: 20, h: 20, vy: 0, gravity: 0.6, isUp: false };
        this.obstacles = []; this.particles = []; this.score = 0; this.alive = true; this.frame = 0;
        this.canvas.addEventListener('pointerdown', () => this.flip());
        this.loop();
    }
    flip() {
        this.player.isUp = !this.player.isUp;
        this.player.gravity = this.player.isUp ? -0.6 : 0.6;
        for(let i=0;i<6;i++) this.particles.push(new Particle(this.player.x, this.player.y, STATE.activeSkin));
    }
    loop() {
        if(!this.alive) return; this.frame++;
        
        // Физика игрока
        this.player.vy += this.player.gravity; this.player.y += this.player.vy;
        if(this.player.y < 0) { this.player.y = 0; this.player.vy = 0; }
        if(this.player.y > this.canvas.height-this.player.h) { this.player.y = this.canvas.height-this.player.h; this.player.vy = 0; }

        // Генерация препятствий
        if(this.frame % 70 === 0) {
            let h = Math.random()*120 + 40; let pass = Math.random()>0.5;
            this.obstacles.push({ x: this.canvas.width, y: pass ? 0 : this.canvas.height-h, w: 24, h: h });
        }

        this.ctx.fillStyle = '#060810'; this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);

        // Рендер игрока
        this.ctx.fillStyle = STATE.activeSkin;
        this.ctx.fillRect(this.player.x, this.
