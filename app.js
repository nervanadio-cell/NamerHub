// ==========================================
// NEXUS CORE // СИСТЕМА ДАННЫХ И ИНТЕРФЕЙСА
// ==========================================

// Безопасное чтение монет
let safeCoins = 100;
try {
    const coins = localStorage.getItem('nexus_coins');
    if (coins && !isNaN(parseInt(coins))) safeCoins = parseInt(coins);
} catch(e) {}

// Безопасная миграция скинов
let safeSkins = ['#00EF72'];
try {
    const skins = localStorage.getItem('nexus_skins');
    if (skins) {
        const parsed = JSON.parse(skins);
        if (Array.isArray(parsed)) {
            safeSkins = parsed;
        } else if (typeof parsed === 'string') {
            safeSkins = [parsed];
        }
    }
} catch(e) {
    const rawSkin = localStorage.getItem('nexus_skins');
    if (rawSkin && rawSkin.startsWith('#')) {
        safeSkins = [rawSkin];
    }
}

// ГЛОБАЛЬНЫЙ СТАТУС ПРИЛОЖЕНИЯ
const STATE = {
    user: localStorage.getItem('nexus_user') || null,
    coins: safeCoins,
    skins: safeSkins,
    activeSkin: localStorage.getItem('nexus_active_skin') || '#00EF72',
    currentGameEngine: null,
    selectedGame: null,
    selectedMode: null
};

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
        { id: 'arcade', name: 'Аркадный Бласт', desc: 'Удаляй блоки кликами, пока поле не переполнилось' }
    ],
    cyberdash: [
        { id: 'neon', name: 'Бесконечный Неон', desc: 'Кликай по экрану, чтобы менять гравитацию и уклоняться' }
    ]
};

const SHOP_CATALOG = [
    { id: '#00EF72', name: 'Acid Neon', price: 0 },
    { id: '#0A84FF', name: 'Deep Space', price: 100 },
    { id: '#BF5AF2', name: 'Cyberpunk', price: 250 },
    { id: '#FF9F0A', name: 'Supernova', price: 500 },
    { id: '#FF375F', name: 'Bloody Mary', price: 800 }
];

function triggerScreenShake() {
    const root = document.getElementById('game-root-container');
    if (root) {
        root.classList.add('shake');
        setTimeout(() => root.classList.remove('shake'), 350);
    }
}

function getBestScore(game, mode) { 
    try { return parseInt(localStorage.getItem(`best_${game}_${mode}`)) || 0; } catch(e) { return 0; }
}

function saveBestScore(game, mode, score) {
    try {
        if (score > getBestScore(game, mode)) { localStorage.setItem(`best_${game}_${mode}`, score); }
    } catch(e) {}
}

function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
}

function updateWallet(amount) {
    STATE.coins += amount; 
    try { localStorage.setItem('nexus_coins', STATE.coins); } catch(e) {}
    const el = document.getElementById('player-coins');
    if (el) el.innerText = STATE.coins;
}

// ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ И СОБЫТИЙ
document.addEventListener('DOMContentLoaded', () => {
    if (STATE.user) { loginSuccess(STATE.user); }

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const inputEl = document.getElementById('username-input');
            const name = inputEl ? inputEl.value.trim() : "";
            if (name.length < 2) return alert('Имя слишком короткое!');
            STATE.user = name; 
            try { localStorage.setItem('nexus_user', name); } catch(e) {}
            loginSuccess(name);
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => { 
            try { localStorage.clear(); } catch(e) {}
            location.reload(); 
        });
    }

    document.querySelectorAll('.dock-item').forEach(btn => {
        btn.addEventListener('click', () => {
            if(btn.id === 'logout-btn') return;
            document.querySelectorAll('.dock-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-page').forEach(t => t.classList.remove('active'));
            btn.classList.add('active'); 
            const tabEl = document.getElementById(btn.dataset.tab);
            if (tabEl) tabEl.classList.add('active');
        });
    });

    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            STATE.selectedGame = card.dataset.game;
            setupModeScreen();
        });
    });

    const backBtn = document.getElementById('back-to-lobby-btn');
    if (backBtn) backBtn.addEventListener('click', () => navigateTo('screen-lobby'));
    
    const startBtn = document.getElementById('start-game-final-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            launchGame(STATE.selectedGame, STATE.selectedMode);
        });
    }

    const exitBtn = document.getElementById('exit-game-btn');
    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            if(STATE.currentGameEngine) STATE.currentGameEngine.destroy();
            const vp = document.getElementById('game-viewport');
            if (vp) vp.innerHTML = '';
            navigateTo('screen-lobby');
        });
    }

    renderShop();
});

function loginSuccess(name) {
    const pName = document.getElementById('player-name');
    const pCoins = document.getElementById('player-coins');
    if (pName) pName.innerText = name;
    if (pCoins) pCoins.innerText = STATE.coins;
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

    const mTitle = document.getElementById('mode-title');
    const mBest = document.getElementById('mode-best-score');
    if (mTitle) mTitle.innerText = `Nexus // Режимы игры`;
    if (mBest) mBest.innerText = getBestScore(STATE.selectedGame, STATE.selectedMode);

    modes.forEach((m, idx) => {
        const b = document.createElement('button');
        b.className = `mode-btn ${idx === 0 ? 'selected' : ''}`;
        b.innerHTML = `<strong>${m.name}</strong><br><small style="color:var(--text-muted)">${m.desc}</small>`;
        b.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('selected'));
            b.classList.add('selected');
            STATE.selectedMode = m.id;
            if (mBest) mBest.innerText = getBestScore(STATE.selectedGame, STATE.selectedMode);
        });
        container.appendChild(b);
    });
}

function renderShop() {
    const container = document.getElementById('skins-container'); 
    if (!container) return;
    container.innerHTML = '';
    SHOP_CATALOG.forEach(item => {
        const isBought = STATE.skins.includes(item.id); 
        const isEquipped = STATE.activeSkin === item.id;
        const card = document.createElement('div'); 
        card.className = 'skin-card';
        card.innerHTML = `
            <div class="skin-preview" style="background-color: ${item.id}"></div>
            <h4>${item.name}</h4>
            <button class="buy-btn ${isEquipped ? 'equipped' : isBought ? 'bought' : ''}">
                ${isEquipped ? 'Надето' : isBought ? 'Надеть' : item.price + ' 🪙'}
            </button>
        `;
        card.querySelector('.buy-btn').addEventListener('click', () => {
            if (isEquipped) return;
            if (isBought) { 
                STATE.activeSkin = item.id; 
                try { localStorage.setItem('nexus_active_skin', item.id); } catch(e) {}
            } else if (STATE.coins >= item.price) {
                updateWallet(-item.price); 
                STATE.skins.push(item.id); 
                STATE.activeSkin = item.id;
                try {
                    localStorage.setItem('nexus_skins', JSON.stringify(STATE.skins)); 
                    localStorage.setItem('nexus_active_skin', item.id);
                } catch(e) {}
            } else { 
                return alert('Не хватает монет!'); 
            }
            renderShop();
        });
        container.appendChild(card);
    });
}

function launchGame(game, mode) {
    navigateTo('screen-game');
    const vp = document.getElementById('game-viewport');
    if (!vp) return;
    vp.innerHTML = '<canvas id="game-canvas"></canvas>';
    const canvas = document.getElementById('game-canvas');
    const size = Math.min(window.innerWidth * 0.92, 460);
    canvas.width = size; canvas.height = size;

    if(game === 'snake') STATE.currentGameEngine = new SeniorSnake(canvas, mode);
    if(game === 'reactor') STATE.currentGameEngine = new TapReactor(canvas, mode);
    if(game === 'blockblast') STATE.currentGameEngine = new BlockBlast(canvas, mode);
    if(game === 'cyberdash') STATE.currentGameEngine = new CyberDash(canvas, mode);
}
