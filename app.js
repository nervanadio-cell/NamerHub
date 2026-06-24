// --- БАЗА ДАННЫХ И СОСТОЯНИЕ (SENIOR STATE MANAGEMENT) ---
const STATE = {
    user: localStorage.getItem('nexus_user') || null,
    coins: parseInt(localStorage.getItem('nexus_coins')) || 50,
    skins: JSON.parse(localStorage.getItem('nexus_skins')) || ['#00EF72'],
    activeSkin: localStorage.getItem('nexus_active_skin') || '#00EF72',
    currentGameEngine: null
};

const SHOP_CATALOG = [
    { id: '#00EF72', name: 'Acid Neon', price: 0 },
    { id: '#0A84FF', name: 'Deep Space', price: 100 },
    { id: '#BF5AF2', name: 'Cyberpunk', price: 250 },
    { id: '#FF9F0A', name: 'Supernova', price: 500 },
    { id: '#FF375F', name: 'Bloody Mary', price: 1000 }
];

// --- НАВИГАЦИЯ ПО ЭКРАНАМ (SMOOTH ROUTER) ---
function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function updateWallet(amount) {
    STATE.coins += amount;
    localStorage.setItem('nexus_coins', STATE.coins);
    document.getElementById('player-coins').innerText = STATE.coins;
}

// --- ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Проверка сессии
    if (STATE.user) {
        document.getElementById('player-name').innerText = STATE.user;
        document.getElementById('player-coins').innerText = STATE.coins;
        navigateTo('screen-lobby');
    }

    // Логин
    document.getElementById('login-btn').addEventListener('click', () => {
        const name = document.getElementById('username-input').value.trim();
        if (name.length < 2) return alert('Имя должно содержать минимум 2 символа!');
        
        STATE.user = name;
        localStorage.setItem('nexus_user', name);
        document.getElementById('player-name').innerText = name;
        document.getElementById('player-coins').innerText = STATE.coins;
        navigateTo('screen-lobby');
    });

    // Выход
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.clear();
        location.reload();
    });

    // Переключение вкладок в доке
    document.querySelectorAll('.dock-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(btn.id === 'logout-btn') return;
            document.querySelectorAll('.dock-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-page').forEach(t => t.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Выход из игры
    document.getElementById('exit-game-btn').addEventListener('click', () => {
        if(STATE.currentGameEngine) STATE.currentGameEngine.destroy();
        document.getElementById('game-viewport').innerHTML = '';
        navigateTo('screen-lobby');
    });

    renderShop();
    initGameLaunchers();
});


// --- МАГАЗИН (RENDER ENGINE) ---
function renderShop() {
    const container = document.getElementById('skins-container');
    container.innerHTML = '';

    SHOP_CATALOG.forEach(item => {
        const isBought = STATE.skins.includes(item.id);
        const isEquipped = STATE.activeSkin === item.id;

        const card = document.createElement('div');
        card.className = 'skin-card';
        card.innerHTML = `
            <div class="skin-preview" style="background-color: ${item.id}; color: ${item.id}"></div>
            <h4>${item.name}</h4>
            <button class="buy-btn ${isEquipped ? 'equipped' : isBought ? 'bought' : ''}" data-id="${item.id}">
                ${isEquipped ? 'Надето' : isBought ? 'Надеть' : item.price + ' <i class="fa-solid fa-coins"></i>'}
            </button>
        `;

        card.querySelector('.buy-btn').addEventListener('click', () => handleSkinClick(item));
        container.appendChild(card);
    });
}

function handleSkinClick(item) {
    if (STATE.skins.includes(item.id)) {
        STATE.activeSkin = item.id;
        localStorage.setItem('nexus_active_skin', item.id);
    } else {
        if (STATE.coins >= item.price) {
            updateWallet(-item.price);
            STATE.skins.push(item.id);
            STATE.activeSkin = item.id;
            localStorage.setItem('nexus_skins', JSON.stringify(STATE.skins));
            localStorage.setItem('nexus_active_skin', item.id);
        } else {
            alert('Недостаточно монет! Нафарми в змейке ;)');
            return;
        }
    }
    renderShop();
}

// --- ЗАПУСК ИГР ---
function initGameLaunchers() {
    document.querySelectorAll('.game-card:not(.locked)').forEach(card => {
        card.addEventListener('click', () => {
            const gameType = card.dataset.game;
            navigateTo('screen-game');
            document.getElementById('current-game-score').innerText = '0';

            const viewport = document.getElementById('game-viewport');
            viewport.innerHTML = '<canvas id="game-canvas"></canvas>';
            const canvas = document.getElementById('game-canvas');
            
            // Настройка Canvas под ретину
            const size = Math.min(window.innerWidth * 0.95, 500);
            canvas.width = size;
            canvas.height = size;

            if (gameType === 'snake') STATE.currentGameEngine = new SeniorSnake(canvas);
            if (gameType === 'reactor') STATE.currentGameEngine = new TapReactor(canvas);
        });
    });
}


/* ========================================================================
   ИГРА 1: SENIOR NEON SNAKE (С плавной интерполяцией движения)
======================================================================== */
class SeniorSnake {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = 20;
        this.tile = canvas.width / this.gridSize;
        
        this.snake = [{x: 10, y: 10}];
        // Храним физическую позицию головы для микро-сдвигов в кадре
        this.drawX = 10 * this.tile; 
        this.drawY = 10 * this.tile;

        this.apple = {x: 5, y: 5};
        this.dir = {x: 1, y: 0};
        this.nextDir = {x: 1, y: 0};
        
        this.score = 0;
        this.speed = 130; // ms на один логический тик
        this.lastTick = 0;
        this.alive = true;

        this.skinColor = STATE.activeSkin;
        this.bindEvents();
        this.spawnApple();
        
        this.animId = requestAnimationFrame((t) => this.loop(t));
    }

    bindEvents() {
        this.handler = (e) => {
            const k = e.key;
            if ((k === 'ArrowUp' || k === 'w') && this.dir.y === 0) this.nextDir = {x: 0, y: -1};
            if ((k === 'ArrowDown' || k === 's') && this.dir.y === 0) this.nextDir = {x: 0, y: 1};
            if ((k === 'ArrowLeft' || k === 'a') && this.dir.x === 0) this.nextDir = {x: -1, y: 0};
            if ((k === 'ArrowRight' || k === 'd') && this.dir.x === 0) this.nextDir = {x: 1, y: 0};
        };
        window.addEventListener('keydown', this.handler);

        // Тапы для мобилок (простейший свайп-детектор)
        let touchStartX = 0, touchStartY = 0;
        this.tsHandler = e => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; };
        this.teHandler = e => {
            let dx = e.changedTouches[0].clientX - touchStartX;
            let dy = e.changedTouches[0].clientY - touchStartY;
            if(Math.abs(dx) > Math.abs(dy)) {
                if(dx > 0 && this.dir.x === 0) this.nextDir = {x: 1, y: 0};
                else if(dx < 0 && this.dir.x === 0) this.nextDir = {x: -1, y: 0};
            } else {
                if(dy > 0 && this.dir.y === 0) this.nextDir = {x: 0, y: 1};
                else if(dy < 0 && this.dir.y === 0) this.nextDir = {x: 0, y: -1};
            }
        };
        window.addEventListener('touchstart', this.tsHandler);
        window.addEventListener('touchend', this.teHandler);
    }

    spawnApple() {
        this.apple.x = Math.floor(Math.random() * this.gridSize);
        this.apple.y = Math.floor(Math.random() * this.gridSize);
    }

    loop(timestamp) {
        if (!this.alive) return;

        // 1. Логический тик (шаг по сетке)
        if (timestamp - this.lastTick > this.speed) {
            this.lastTick = timestamp;
            this.dir = this.nextDir;

            let newHead = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

            // Проверка стен (сквозные стены как в олдскуле)
            if (newHead.x < 0) newHead.x = this.gridSize - 1;
            if (newHead.x >= this.gridSize) newHead.x = 0;
            if (newHead.y < 0) newHead.y = this.gridSize - 1;
            if (newHead.y >= this.gridSize) newHead.y = 0;

            // Самоедство
            for (let part of this.snake) {
                if (part.x === newHead.x && part.y === newHead.y) {
                    this.alive = false;
                    alert(`GAME OVER! Заработано монет: ${this.score}`);
                    updateWallet(this.score);
                    return;
                }
            }

            this.snake.unshift(newHead);

            // Кушаем яблоко
            if (newHead.x === this.apple.x && newHead.y === this.apple.y) {
                this.score++;
                document.getElementById('current-game-score').innerText = this.score;
                this.spawnApple();
            } else {
                this.snake.pop();
            }
        }

        // 2. Отрисовка с интерполяцией (Lerp)
        this.ctx.fillStyle = '#07090e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Сетка на фоне
        this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        for(let i=0; i<this.canvas.width; i+=this.tile) {
            this.ctx.beginPath(); this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.canvas.height); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(0, i); this.ctx.lineTo(this.canvas.width, i); this.ctx.stroke();
        }

        // Яблоко (пульсирующий неон)
        this.ctx.shadowColor = '#FFD60A';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = '#FFD60A';
        this.ctx.beginPath();
        this.ctx.arc(this.apple.x * this.tile + this.tile/2, this.apple.y * this.tile + this.tile/2, this.tile*0.35, 0, Math.PI*2);
        this.ctx.fill();

        // Змея
        this.ctx.shadowColor = this.skinColor;
        this.ctx.shadowBlur = 12;
        this.ctx.fillStyle = this.skinColor;

        // Плавный докат головы к целевой ячейке
        let targetX = this.snake[0].x * this.tile;
        let targetY = this.snake[0].y * this.tile;
        this.drawX += (targetX - this.drawX) * 0.35;
        this.drawY += (targetY - this.drawY) * 0.35;

        // Рисуем хвост
        for (let i = 1; i < this.snake.length; i++) {
            this.ctx.fillRect(this.snake[i].x * this.tile + 2, this.snake[i].y * this.tile + 2, this.tile - 4, this.tile - 4);
        }
        // Рисуем голову
        this.ctx.fillRect(this.drawX + 1, this.drawY + 1, this.tile - 2, this.tile - 2);

        this.ctx.shadowBlur = 0; // Сброс теней
        this.animId = requestAnimationFrame((t) => this.loop(t));
    }

    destroy() {
        this.alive = false;
        cancelAnimationFrame(this.animId);
        window.removeEventListener('keydown', this.handler);
        window.removeEventListener('touchstart', this.tsHandler);
        window.removeEventListener('touchend', this.teHandler);
    }
}


/* ========================================================================
   ИГРА 2: TAP REACTOR (Игра на скорость реакции)
======================================================================== */
class TapReactor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.circles = [];
        this.score = 0;
        this.alive = true;
        this.spawnTimer = null;
        
        this.canvas.addEventListener('pointerdown', (e) => this.tap(e));
        this.start();
        this.loop();
    }

    start() {
        const spawn = () => {
            if(!this.alive) return;
            if(this.circles.length < 5) {
                this.circles.push({
                    x: Math.random() * (this.canvas.width - 80) + 40,
                    y: Math.random() * (this.canvas.height - 80) + 40,
                    radius: 0,
                    maxRadius: Math.random() * 20 + 30,
                    color: STATE.activeSkin,
                    life: 100 // Уменьшается каждый тик
                });
            }
            this.spawnTimer = setTimeout(spawn, Math.random() * 600 + 400);
        };
        spawn();
    }

    tap(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        for (let i = this.circles.length - 1; i >= 0; i--) {
            let c = this.circles[i];
            let dist = Math.hypot(x - c.x, y - c.y);
            if (dist <= c.maxRadius) {
                this.circles.splice(i, 1);
                this.score += 2;
                document.getElementById('current-game-score').innerText = this.score;
                return;
            }
        }
        // Промах = минус жизнь или штраф. Сделаем минус 1 очко
        this.score = Math.max(0, this.score - 1);
        document.getElementById('current-game-score').innerText = this.score;
    }

    loop() {
        if(!this.alive) return;

        this.ctx.fillStyle = '#07090e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.circles.length - 1; i >= 0; i--) {
            let c = this.circles[i];
            if(c.radius < c.maxRadius) c.radius += 2;
            c.life -= 0.6; // Скорость исчезновения

            if (c.life <= 0) {
                this.circles.splice(i, 1);
                continue;
            }

            this.ctx.shadowColor = c.color;
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = c.color;
            this.ctx.globalAlpha = c.life / 100;

            this.ctx.beginPath();
            this.ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        }

        requestAnimationFrame(() => this.loop());
    }

    destroy() {
        this.alive = false;
        clearTimeout(this.spawnTimer);
    }
}
