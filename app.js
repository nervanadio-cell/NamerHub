/**
 * @file app.js
 * @description Модульная архитектура игрового хаба уровня Senior. 
 * Включает локальное хранилище, кастомную анимационную систему, виртуальный геймпад для мобильных устройств,
 * магазин скинов и полностью функциональный игровой движок Snake (Змейка) с поддержкой кастомных текстур/скинов.
 * @version 1.0.0
 */

'use strict';

/**
 * 1. EVENT BUS (ШИНА СОБЫТИЙ)
 * Используется для слабой связанности компонентов (Decoupling)
 */
class EventBus {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(listener => listener !== callback);
    }

    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBus] Ошибка в обработчике события "${event}":`, error);
            }
        });
    }
}

const globalStoreStoreBus = new EventBus();

/**
 * 2. STATE MANAGEMENT (УПРАВЛЕНИЕ СОСТОЯНИЕМ)
 * Работает исключительно с localStorage клиента. Защищено от сбоев парсинга.
 */
class StateManager {
    constructor() {
        this.STORAGE_KEY = 'arcade_platform_state';
        this.state = this._loadInitialState();
    }

    _loadInitialState() {
        const defaultState = {
            balance: 500, // Стартовая валюта для проверки магазина
            highScores: {
                snake: 0,
                blockblast: 0
            },
            inventory: ['skin_default'],
            equippedSkins: {
                snake: 'skin_default'
            },
            settings: {
                sound: true,
                vibration: true
            }
        };

        try {
            const localData = localStorage.getItem(this.STORAGE_KEY);
            if (!localData) {
                this._saveToStorage(defaultState);
                return defaultState;
            }
            // Глубокое объединение, чтобы при обновлении структуры данных старые кэши не ломали приложение
            const parsed = JSON.parse(localData);
            return { ...defaultState, ...parsed, highScores: { ...defaultState.highScores, ...parsed.highScores }, equippedSkins: { ...defaultState.equippedSkins, ...parsed.equippedSkins } };
        } catch (e) {
            console.error('[StateManager] Критическая ошибка чтения localStorage. Инициализирован дефолтный стейт.', e);
            return defaultState;
        }
    }

    _saveToStorage(state) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('[StateManager] Не удалось сохранить состояние в localStorage:', e);
        }
    }

    get(path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], this.state);
    }

    set(path, value) {
        const parts = path.split('.');
        let current = this.state;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
        this._saveToStorage(this.state);
        globalStoreStoreBus.emit(`stateChanged:${path}`, value);
        globalStoreStoreBus.emit('stateChanged', this.state);
    }

    addBalance(amount) {
        const currentBalance = this.get('balance');
        this.set('balance', currentBalance + amount);
    }

    deductBalance(amount) {
        const currentBalance = this.get('balance');
        if (currentBalance >= amount) {
            this.set('balance', currentBalance - amount);
            return true;
        }
        return false;
    }
}

const store = new StateManager();

/**
 * 3. CONFIGURATION & REGISTRY (РЕЕСТР СКИРОВ И КОНФИГУРАЦИЯ)
 */
const SKINS_REGISTRY = [
    { id: 'skin_default', name: 'Классический зеленый', price: 0, color: '#4CAF50', headColor: '#2E7D32' },
    { id: 'skin_neon_pulse', name: 'Неоновый импульс', price: 200, color: '#00ffff', headColor: '#ff00ff' },
    { id: 'skin_royal_gold', name: 'Королевское золото', price: 450, color: '#FFD700', headColor: '#B8860B' },
    { id: 'skin_ruby_lava', name: 'Рубиновая лава', price: 600, color: '#FF4500', headColor: '#8B0000' }
];

/**
 * 4. TOUCH CONTROLS MANAGER (МОБИЛЬНАЯ АДАПТАЦИЯ И ВИРТУАЛЬНЫЙ ГЕЙМПАД)
 * Автоматически генерирует высокотехнологичный D-Pad для сенсорных экранов.
 */
class TouchControlsManager {
    constructor() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.container = null;
    }

    init() {
        if (!this.isMobile) return;
        this._injectStyles();
        this._createDPad();
        this.hide(); // Скрываем по умолчанию, показываем только внутри запущенной игры
    }

    _injectStyles() {
        if (document.getElementById('mobile-controls-styles')) return;
        const style = document.createElement('style');
        style.id = 'mobile-controls-styles';
        style.innerHTML = `
            .mobile-dpad-container {
                position: fixed;
                bottom: 40px;
                left: 50%;
                transform: translateX(-50%);
                width: 180px;
                height: 180px;
                z-index: 999999;
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                grid-template-rows: repeat(3, 1fr);
                gap: 5px;
                pointer-events: auto;
            }
            .dpad-btn {
                background: rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 16px;
                color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                user-select: none;
                -webkit-user-select: none;
                transition: transform 0.05s ease, background 0.1s ease;
                box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
            }
            .dpad-btn:active {
                transform: scale(0.92);
                background: rgba(255, 255, 255, 0.25);
                border-color: rgba(255, 255, 255, 0.4);
            }
            .dpad-up { grid-column: 2; grid-row: 1; }
            .dpad-left { grid-column: 1; grid-row: 2; }
            .dpad-right { grid-column: 3; grid-row: 2; }
            .dpad-down { grid-column: 2; grid-row: 3; }
        `;
        document.head.appendChild(style);
    }

    _createDPad() {
        this.container = document.createElement('div');
        this.container.className = 'mobile-dpad-container';

        const directions = [
            { cls: 'dpad-up', key: 'ArrowUp', html: '▲' },
            { cls: 'dpad-left', key: 'ArrowLeft', html: '◀' },
            { cls: 'dpad-right', key: 'ArrowRight', html: '▶' },
            { cls: 'dpad-down', key: 'ArrowDown', html: '▼' }
        ];

        directions.forEach(dir => {
            const btn = document.createElement('div');
            btn.className = `dpad-btn ${dir.cls}`;
            btn.innerHTML = dir.html;
            
            // Использование точечных Touch-событий для мгновенного отклика (Fast-Response) без задержки в 300мс
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (store.get('settings.vibration') && navigator.vibrate) {
                    navigator.vibrate(15); // Лёгкий тактильный отклик (Haptic Feedback)
                }
                window.dispatchEvent(new KeyboardEvent('keydown', { key: dir.key }));
            }, { passive: false });

            this.container.appendChild(btn);
        });

        document.body.appendChild(this.container);
    }

    show() {
        if (this.container) this.container.style.display = 'grid';
    }

    hide() {
        if (this.container) this.container.style.display = 'none';
    }
}

const touchControls = new TouchControlsManager();

/**
 * 5. UI MANAGER & NAVIGATION (МЕНЕДЖЕР ИНТЕРФЕЙСА)
 * Управляет экранами платформы с применением кастомных таймингов анимации iOS (fast-slow-fast).
 */
class UIManager {
    constructor() {
        this.screens = {
            lobby: document.getElementById('screen-lobby'),
            shop: document.getElementById('screen-shop'),
            game: document.getElementById('screen-game')
        };
        this.currentScreen = 'lobby';
    }

    init() {
        this._setupDOMStructureIfMissing();
        this._bindEvents();
        this.renderBalances();
        this.renderShop();
        this.navigateTo('lobby');
    }

    _setupDOMStructureIfMissing() {
        // Если базовых контейнеров нет в HTML, плагин генерирует их динамически для абсолютной отказоустойчивости
        if (!this.screens.lobby) {
            const root = document.createElement('div');
            root.id = 'app-root';
            root.innerHTML = `
                <div id="screen-lobby" class="app-screen">
                    <header class="hub-header">
                        <h1>ARCADE HUB</h1>
                        <div class="balance-display">Монеты: <span class="coin-count">0</span></div>
                    </header>
                    <div class="games-grid">
                        <div class="game-card" data-game="snake">
                            <h3>Classic Snake</h3>
                            <p>Рекорд: <span id="snake-high-score">0</span></p>
                            <button class="btn-play">ИГРАТЬ</button>
                        </div>
                    </div>
                    <button id="nav-to-shop" class="btn-nav">Открыть Магазин Скинов</button>
                </div>
                <div id="screen-shop" class="app-screen" style="display:none;">
                    <header class="hub-header">
                        <button id="nav-shop-back" class="btn-back">◀ Назад</button>
                        <h2>МАГАЗИН СКИНОВ</h2>
                        <div class="balance-display">Монеты: <span class="coin-count">0</span></div>
                    </header>
                    <div id="shop-items-container" class="shop-grid"></div>
                </div>
                <div id="screen-game" class="app-screen" style="display:none;">
                    <header class="game-header">
                        <button id="btn-exit-game" class="btn-back">Выйти</button>
                        <div id="live-score">Счет: 0</div>
                    </header>
                    <div class="canvas-wrapper">
                        <canvas id="game-canvas" width="400" height="400"></canvas>
                    </div>
                </div>
            `;
            document.body.appendChild(root);
            
            // Переинициализируем ссылки на DOM элементы
            this.screens.lobby = document.getElementById('screen-lobby');
            this.screens.shop = document.getElementById('screen-shop');
            this.screens.game = document.getElementById('screen-game');
        }

        this._injectGlobalStyles();
    }

    _injectGlobalStyles() {
        if (document.getElementById('core-ui-styles')) return;
        const style = document.createElement('style');
        style.id = 'core-ui-styles';
        style.innerHTML = `
            :root {
                --ios-bezier: cubic-bezier(0.25, 1, 0.5, 1); /* Фирменная кривая плавности fast-slow-fast */
                --bg-dark: #0f1115;
                --surface-dark: #1b1e24;
                --accent-blue: #007aff;
            }
            body {
                margin: 0;
                padding: 0;
                background-color: var(--bg-dark);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #ffffff;
                overflow: hidden;
            }
            .app-screen {
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                padding: 20px;
                box-sizing: border-box;
                transition: transform 0.5s var(--ios-bezier), opacity 0.5s var(--ios-bezier);
                opacity: 0;
                transform: scale(0.95);
                pointer-events: none;
                display: flex;
                flex-direction: column;
            }
            .app-screen.active-view {
                opacity: 1;
                transform: scale(1);
                pointer-events: auto;
            }
            .hub-header, .game-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
            }
            .balance-display {
                background: rgba(255, 255, 255, 0.05);
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 600;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .games-grid, .shop-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 20px;
                flex-grow: 1;
                overflow-y: auto;
            }
            .game-card, .shop-card {
                background: var(--surface-dark);
                border-radius: 24px;
                padding: 24px;
                border: 1px solid rgba(255, 255, 255, 0.03);
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                transition: transform 0.2s ease;
            }
            .game-card:active, .shop-card:active {
                transform: scale(0.98);
            }
            .btn-play, .btn-nav, .btn-back, .btn-shop-action {
                background: var(--accent-blue);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 14px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s, opacity 0.1s;
            }
            .btn-play { width: 100%; margin-top: 15px; }
            .btn-back { background: rgba(255,255,255,0.1); }
            .btn-nav { margin-top: 20px; align-self: center; background: #34c759; }
            .canvas-wrapper {
                flex-grow: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            canvas {
                background: #11141a;
                border-radius: 20px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                max-width: 100%;
                max-height: 70vh;
                aspect-ratio: 1 / 1;
            }
            .shop-card.equipped { border-color: #34c759; }
            .btn-shop-action.owned { background: #5856d6; }
            .btn-shop-action.active-skin { background: #34c759; }
        `;
        document.head.appendChild(style);
    }

    _bindEvents() {
        document.getElementById('nav-to-shop').addEventListener('click', () => this.navigateTo('shop'));
        document.getElementById('nav-shop-back').addEventListener('click', () => this.navigateTo('lobby'));
        document.getElementById('btn-exit-game').addEventListener('click', () => {
            globalStoreStoreBus.emit('game:requestExit');
        });

        document.querySelector('.game-card[data-game="snake"] .btn-play').addEventListener('click', () => {
            this.navigateTo('game');
            globalStoreStoreBus.emit('game:start', 'snake');
        });

        globalStoreStoreBus.on('stateChanged', () => {
            this.renderBalances();
            this.updateHighScores();
        });
    }

    navigateTo(screenKey) {
        Object.keys(this.screens).forEach(key => {
            this.screens[key].classList.remove('active-view');
            // Эмуляция полного жизненного цикла отображения UI элементов
            setTimeout(() => {
                if (key !== screenKey) this.screens[key].style.display = 'none';
            }, 500); 
        });

        const targetScreen = this.screens[screenKey];
        targetScreen.style.display = 'flex';
        // Форсируем перерисовку браузера (Reflow) для запуска CSS анимации
        void targetScreen.offsetWidth; 
        targetScreen.classList.add('active-view');
        this.currentScreen = screenKey;

        // Показ виртуального джойстика только во время игры
        if (screenKey === 'game') {
            touchControls.show();
        } else {
            touchControls.hide();
        }
    }

    renderBalances() {
        const currentBalance = store.get('balance');
        document.querySelectorAll('.coin-count').forEach(el => {
            el.textContent = currentBalance;
        });
    }

    updateHighScores() {
        const score = store.get('highScores.snake');
        const element = document.getElementById('snake-high-score');
        if (element) element.textContent = score;
    }

    renderShop() {
        const container = document.getElementById('shop-items-container');
        if (!container) return;

        container.innerHTML = '';
        const ownedSkins = store.get('inventory');
        const equippedSkin = store.get('equippedSkins.snake');

        SKINS_REGISTRY.forEach(skin => {
            const card = document.createElement('div');
            const isOwned = ownedSkins.includes(skin.id);
            const isEquipped = equippedSkin === skin.id;

            card.className = `shop-card ${isEquipped ? 'equipped' : ''}`;
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:15px;">
                    <div style="width:30px; height:30px; border-radius:50%; background:${skin.color}; border: 2px solid ${skin.headColor}"></div>
                    <h4 style="margin:0; font-size:18px;">${skin.name}</h4>
                </div>
                <p style="color:rgba(255,255,255,0.6); margin-bottom:20px;">Цена: ${skin.price === 0 ? 'Бесплатно' : skin.price + ' монет'}</p>
                <button class="btn-shop-action ${isEquipped ? 'active-skin' : (isOwned ? 'owned' : '')}" data-id="${skin.id}">
                    ${isEquipped ? 'ЭКИПИРОВАНО' : (isOwned ? 'ЭКИПИРОВАТЬ' : 'КУПИТЬ')}
                </button>
            `;

            const actionBtn = card.querySelector('.btn-shop-action');
            actionBtn.addEventListener('click', () => this._handleShopAction(skin, isOwned, isEquipped));

            container.appendChild(card);
        });
    }

    _handleShopAction(skin, isOwned, isEquipped) {
        if (isEquipped) return;

        if (isOwned) {
            store.set('equippedSkins.snake', skin.id);
            this.renderShop();
            return;
        }

        // Процесс транзакции покупки
        if (store.deductBalance(skin.price)) {
            const currentInventory = store.get('inventory');
            currentInventory.push(skin.id);
            store.set('inventory', currentInventory);
            store.set('equippedSkins.snake', skin.id);
            this.renderShop();
        } else {
            alert('Недостаточно монет для покупки этого скина!');
        }
    }
}

const ui = new UIManager();

/**
 * 6. GAME CORE & EXTENDABLE SNAKE ENGINE (ДВИЖОК ЗМЕЙКИ)
 * Реализация на чистом HTML5 Canvas 2D. Поддерживает дельту времени и requestAnimationFrame.
 */
class SnakeGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gridSize = 20;
        this.tileCount = 20;
        
        // Переменные состояния игры
        this.snake = [];
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        this.food = { x: 0, y: 0 };
        this.score = 0;
        this.gameInterval = null;
        this.isRunning = false;
        
        // Настройки таймингов игрового цикла (Мягкое скольжение)
        this.lastRenderTime = 0;
        this.gameSpeed = 8; // Клеток в секунду
    }

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this._bindControls();
    }

    start() {
        const activeSkinId = store.get('equippedSkins.snake');
        this.activeSkin = SKINS_REGISTRY.find(s => s.id === activeSkinId) || SKINS_REGISTRY[0];

        this.snake = [
            { x: 10, y: 10 },
            { x: 10, y: 11 },
            { x: 10, y: 12 }
        ];
        this.direction = { x: 0, y: -1 };
        this.nextDirection = { x: 0, y: -1 };
        this.score = 0;
        this._updateScoreUI();
        this._generateFood();
        this.isRunning = true;
        this.lastRenderTime = 0;

        // Запуск единого игрового рендер-цикла без утечек памяти
        requestAnimationFrame((time) => this._gameLoop(time));
    }

    stop() {
        this.isRunning = false;
    }

    _bindControls() {
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;
            
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.direction.y !== 1) this.nextDirection = { x: 0, y: -1 };
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.direction.y !== -1) this.nextDirection = { x: 0, y: 1 };
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.direction.x !== 1) this.nextDirection = { x: -1, y: 0 };
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.direction.x !== -1) this.nextDirection = { x: 1, y: 0 };
                    break;
            }
        });
    }

    _gameLoop(currentTime) {
        if (!this.isRunning) return;

        requestAnimationFrame((time) => this._gameLoop(time));

        const secondsSinceLastRender = (currentTime - this.lastRenderTime) / 1000;
        if (secondsSinceLastRender < 1 / this.gameSpeed) return;

        this.lastRenderTime = currentTime;

        this._updateLogic();
        this._drawVisuals();
    }

    _updateLogic() {
        this.direction = this.nextDirection;
        
        // Вычисление координат новой головы змейки
        const head = { 
            x: this.snake[0].x + this.direction.x, 
            y: this.snake[0].y + this.direction.y 
        };

        // Обработка выхода за границы экрана (Телепортация на противоположную сторону)
        if (head.x < 0) head.x = this.tileCount - 1;
        if (head.x >= this.tileCount) head.x = 0;
        if (head.y < 0) head.y = this.tileCount - 1;
        if (head.y >= this.tileCount) head.y = 0;

        // Проверка на столкновение с собственным телом (Self-Collision)
        for (let i = 0; i < this.snake.length; i++) {
            if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                this._gameOver();
                return;
            }
        }

        // Вставка новой головы в начало массива
        this.snake.unshift(head);

        // Проверка на поглощение еды
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            store.addBalance(2); // Награда: 2 монеты за каждую еду
            this._updateScoreUI();
            this._generateFood();
            
            // Динамическое увеличение сложности (скорости)
            if (this.score % 50 === 0 && this.gameSpeed < 20) {
                this.gameSpeed += 1;
            }
        } else {
            this.snake.pop(); // Удаляем хвост, если еда не была съедена
        }
    }

    _drawVisuals() {
        // Очистка кадра
        this.ctx.fillStyle = '#11141a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Отрисовка сетки (Subtle Background Grid) для премиального визуала
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.tileCount; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.gridSize, 0);
            this.ctx.lineTo(i * this.gridSize, this.canvas.height);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.gridSize);
            this.ctx.lineTo(this.canvas.width, i * this.gridSize);
            this.ctx.stroke();
        }

        // Отрисовка сочной неоновой еды
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = '#ff3b30';
        this.ctx.fillStyle = '#ff3b30';
        this.ctx.beginPath();
        const radius = this.gridSize / 2 - 2;
        this.ctx.arc(
            this.food.x * this.gridSize + this.gridSize / 2,
            this.food.y * this.gridSize + this.gridSize / 2,
            radius, 0, Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.shadowBlur = 0; // Сброс тени

        // Отрисовка змейки с применением текущего скина из Магазина
        this.snake.forEach((part, index) => {
            const isHead = index === 0;
            this.ctx.fillStyle = isHead ? this.activeSkin.headColor : this.activeSkin.color;
            
            // Вычисляем скругление для красивого сглаженного тела змейки
            const x = part.x * this.gridSize + 1;
            const y = part.y * this.gridSize + 1;
            const size = this.gridSize - 2;
            const radius = isHead ? 6 : 4;

            this.ctx.beginPath();
            this.ctx.roundRect(x, y, size, size, radius);
            this.ctx.fill();
        });
    }

    _generateFood() {
        let newFoodPos;
        let isColliding = true;

        while (isColliding) {
            newFoodPos = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
            
            // Проверяем, чтобы еда не заспавнилась внутри тела змеи
            isColliding = this.snake.some(part => part.x === newFoodPos.x && part.y === newFoodPos.y);
        }
        this.food = newFoodPos;
    }

    _updateScoreUI() {
        const scoreEl = document.getElementById('live-score');
        if (scoreEl) scoreEl.textContent = `Счет: ${this.score}`;
    }

    _gameOver() {
        this.stop();
        
        const currentHighScore = store.get('highScores.snake');
        let isNewRecord = false;
        if (this.score > currentHighScore) {
            store.set('highScores.snake', this.score);
            isNewRecord = true;
        }

        alert(`ИГРА ОКОНЧЕНА!\nВаш счет: ${this.score}${isNewRecord ? '\nНОВЫЙ РЕКОРД!' : ''}`);
        ui.navigateTo('lobby');
    }
}

const snakeEngine = new SnakeGame();

/**
 * 7. CORE INITIALIZER (ГЛАВНАЯ ТОЧКА ВХОДА)
 * Оркестрация жизненного цикла приложения.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация адаптивных мобильных систем
    touchControls.init();
    
    // Инициализация UI Менеджера систем
    ui.init();
    ui.updateHighScores();

    // Настройка игрового контроллера
    snakeEngine.init('game-canvas');

    // Прослушивание системных хуков ядра платформы через EventBus
    globalStoreStoreBus.on('game:start', (gameId) => {
        if (gameId === 'snake') {
            this.gameSpeed = 8; // Сброс скорости
            snakeEngine.start();
        }
    });

    globalStoreStoreBus.on('game:requestExit', () => {
        if (confirm('Вы уверены, что хотите выйти в лобби? Текущий прогресс будет потерян.')) {
            snakeEngine.stop();
            ui.navigateTo('lobby');
        }
    });
});
